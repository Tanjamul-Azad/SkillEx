package com.skillex.service.match.graph;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Detects circular skill-exchange chains in the exchange graph.
 *
 * <h3>What it solves</h3>
 * Sometimes two users cannot directly exchange skills because A offers what B
 * wants, but B does not offer what A wants.  However, a <em>third</em> user C
 * may bridge the gap: B offers what C wants, and C offers what A wants.
 * The result is a three-way cycle — everyone teaches one person and learns
 * from another.
 *
 * <h3>Algorithm</h3>
 * For each start node A the detector runs a bounded DFS:
 * <pre>
 *   for A in allNodes:
 *     for B in neighbours(A):        // A→B exists
 *       for C in neighbours(B):      // B→C exists, C ≠ A
 *         if edge C→A exists:        // C→A closes the cycle
 *           record chain [A, B, C]
 * </pre>
 * This finds all <b>simple 3-cycles</b> in O(n · d²) where d is the average
 * out-degree.  4-cycles and 5-cycles are supported via the recursive DFS
 * overload, capped at {@code maxLength} to keep runtime predictable.
 *
 * <h3>Deduplication</h3>
 * The same cycle can be discovered starting from any of its nodes.
 * Cycles are normalised by rotating until the lexicographically smallest
 * user ID is first, then de-duplicated via a {@link LinkedHashSet}.
 *
 * <h3>OOP notes</h3>
 * <ul>
 *   <li>Single Responsibility: only cycle detection — no scoring, no DB access</li>
 *   <li>Open/Closed: swap in alternative algorithms by injecting a different
 *       {@code ExchangeChainDetector} bean (e.g. Johnson's algorithm for large graphs)</li>
 * </ul>
 *
 * @see ExchangeGraph
 * @see ExchangeChain
 * @see ExchangeGraphBuilder
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ExchangeChainDetector {

    /** Absolute maximum chain length — prevents combinatorial explosion. */
    private static final int MAX_CHAIN_LENGTH = 5;

    // ── Public API ────────────────────────────────────────────────────────────

    /**
     * Find all 3-way exchange chains that include {@code userId}.
     *
     * <p>Builds a fresh local subgraph (2-hop neighbourhood) for the user,
     * then detects all 3-cycles within it.  Returns an empty list if no chains
     * exist for this user.
     *
     * @param userId  the focal user
     * @param builder graph builder to obtain the current state of the graph
     * @return deduplicated list of three-way {@link ExchangeChain}s involving
     *         this user, ordered by chain length then participant IDs
     */
    public List<ExchangeChain> findChainsForUser(String userId, ExchangeGraphBuilder builder) {
        // Build a 2-hop subgraph — only nodes that can participate in a
        // 3-cycle with this user need to be included.
        ExchangeGraph subgraph = builder.buildSubgraph(userId, 2);

        List<ExchangeChain> all = detect(subgraph, 3);

        // Filter to chains that actually involve the requested user
        List<ExchangeChain> forUser = all.stream()
            .filter(c -> c.userIds().contains(userId))
            .collect(Collectors.toList());

        log.debug("findChainsForUser({}): {} chains found (subgraph: {} nodes)",
            userId, forUser.size(), subgraph.nodeCount());

        return forUser;
    }

    /**
     * Find <em>all</em> chains of exactly {@code chainLength} participants across
     * the entire graph.
     *
     * @param graph       fully built exchange graph
     * @param chainLength number of participants (≥ 3, ≤ {@value #MAX_CHAIN_LENGTH})
     * @return deduplicated, sorted list of chains
     * @throws IllegalArgumentException if chainLength is out of range
     */
    public List<ExchangeChain> detect(ExchangeGraph graph, int chainLength) {
        if (chainLength < 3 || chainLength > MAX_CHAIN_LENGTH) {
            throw new IllegalArgumentException(
                "chainLength must be between 3 and " + MAX_CHAIN_LENGTH + ", got: " + chainLength);
        }

        Set<String> seenNormalized = new LinkedHashSet<>();
        List<ExchangeChain>  results = new ArrayList<>();

        for (String startId : graph.allNodes().keySet()) {
            List<String> path = new ArrayList<>();
            path.add(startId);
            dfs(graph, startId, startId, path, chainLength, seenNormalized, results);
        }

        results.sort(Comparator
            .comparingInt(ExchangeChain::length)
            .thenComparing(c -> c.userIds().get(0)));

        log.debug("ExchangeChainDetector.detect(length={}): {} chains in graph with {} nodes",
            chainLength, results.size(), graph.nodeCount());

        return results;
    }

    // ── Private DFS ───────────────────────────────────────────────────────────

    /**
     * Recursive depth-first search for directed cycles of exactly {@code targetLength}.
     *
     * @param graph         the exchange graph
     * @param start         the node at which the current path started (cycle root)
     * @param current       the node currently being explored
     * @param path          the current DFS path (includes {@code start})
     * @param targetLength  desired cycle length
     * @param seen          normalised cycle fingerprints already recorded
     * @param results       accumulator for discovered chains
     */
    private void dfs(
            ExchangeGraph graph,
            String start,
            String current,
            List<String> path,
            int targetLength,
            Set<String> seen,
            List<ExchangeChain> results) {

        if (path.size() == targetLength) {
            // Check if the last node can close the cycle back to start
            if (graph.hasEdge(current, start)) {
                String normalized = normalise(path);
                if (seen.add(normalized)) {
                    results.add(buildChain(graph, path));
                }
            }
            return;
        }

        for (ExchangeGraphEdge edge : graph.outgoingEdges(current)) {
            String next = edge.toUserId();

            // Only allow revisiting the start node as the very last step (to close the cycle)
            if (next.equals(start) && path.size() < targetLength) continue;
            // Avoid visiting non-start nodes already in the path (simple cycle guarantee)
            if (!next.equals(start) && path.contains(next))       continue;

            path.add(next);
            dfs(graph, start, next, path, targetLength, seen, results);
            path.remove(path.size() - 1);  // backtrack
        }
    }

    /**
     * Build an {@link ExchangeChain} from a cycle path (does not include the
     * closing edge back to startId — the record's last element closes it implicitly).
     */
    private ExchangeChain buildChain(ExchangeGraph graph, List<String> path) {
        List<String>      names    = new ArrayList<>();
        List<Set<String>> perHop   = new ArrayList<>();

        for (int i = 0; i < path.size(); i++) {
            String fromId = path.get(i);
            String toId   = path.get((i + 1) % path.size()); // wraps around (closing hop)

            graph.getNode(fromId).ifPresent(n -> names.add(n.name()));

            // Find matching skills on this hop's edge
            Set<String> matchingSkills = graph.outgoingEdges(fromId).stream()
                .filter(e -> e.toUserId().equals(toId))
                .findFirst()
                .map(ExchangeGraphEdge::matchingSkillIds)
                .orElse(Set.of());

            perHop.add(matchingSkills);
        }

        return new ExchangeChain(path, names, perHop);
    }

    /**
     * Normalise a cycle path to a canonical form so that
     * {@code [A, B, C]}, {@code [B, C, A]}, and {@code [C, A, B]} all
     * produce the same string — enabling deduplication.
     *
     * <p>Strategy: rotate until the lexicographically smallest ID is first,
     * then join with commas.
     */
    private String normalise(List<String> path) {
        int minIdx = 0;
        for (int i = 1; i < path.size(); i++) {
            if (path.get(i).compareTo(path.get(minIdx)) < 0) minIdx = i;
        }
        List<String> rotated = new ArrayList<>(path.size());
        for (int i = 0; i < path.size(); i++) {
            rotated.add(path.get((minIdx + i) % path.size()));
        }
        return String.join(",", rotated);
    }
}
