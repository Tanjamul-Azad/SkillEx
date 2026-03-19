package com.skillex.service.match.graph;

import com.skillex.model.Skill;
import com.skillex.model.User;
import com.skillex.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Builds the {@link ExchangeGraph} from the live database.
 *
 * <h3>Algorithm</h3>
 * <ol>
 *   <li>Load all users with their offered skills in one JPQL query.</li>
 *   <li>Load all users with their wanted skills in a second JPQL query
 *       (two queries instead of one avoids a Cartesian-product JOIN when
 *       both collections are fetched simultaneously).</li>
 *   <li>Merge the two result sets in memory to produce an
 *       {@link ExchangeGraphNode} per user.</li>
 *   <li>For every ordered pair {@code (A, B)} where {@code A ≠ B}:
 *       compute {@code A.wantedSkillIds ∩ B.offeredSkillIds}.
 *       If non-empty, add a directed edge {@code A → B}.</li>
 * </ol>
 *
 * <h3>Complexity</h3>
 * Time O(n²·s) where n = number of users and s = average skills per user.
 * For a typical single-university deployment (n ≤ 5 000) this completes in
 * well under a second.  When the platform grows, add pagination or switch to
 * a native graph database.
 *
 * <h3>OOP notes</h3>
 * <ul>
 *   <li>Single Responsibility: only graph construction — no scoring, no routing</li>
 *   <li>Open/Closed: the build strategy (full vs. partial) can be varied by
 *       adding overloads without touching this core method</li>
 * </ul>
 *
 * @see ExchangeGraph
 * @see ExchangeGraphNode
 * @see ExchangeGraphEdge
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ExchangeGraphBuilder {

    private final UserRepository userRepository;

    // ── Public API ────────────────────────────────────────────────────────────

    /**
     * Build and return a complete exchange graph for all active users.
     *
     * <p>This is a read-only, transactional operation — it will not modify any
     * database state.
     *
     * @return fully connected {@link ExchangeGraph}
     */
    @Transactional(readOnly = true)
    public ExchangeGraph build() {
        log.debug("ExchangeGraphBuilder: starting full graph build");

        // ── Step 1: Load offered and wanted skills separately (no N+1) ──────
        List<User> withOffered = userRepository.findAllWithOfferedSkills();
        List<User> withWanted  = userRepository.findAllWithWantedSkills();

        // ── Step 2: Merge into node map (offered + wanted per user) ──────────
        Map<String, ExchangeGraphNode> nodes = mergeIntoNodes(withOffered, withWanted);

        // ── Step 3: Build the ExchangeGraph with all nodes ───────────────────
        ExchangeGraph graph = new ExchangeGraph();
        for (ExchangeGraphNode node : nodes.values()) {
            graph.addNode(node);
        }

        // ── Step 4: Add directed edges A → B when A.wanted ∩ B.offered ≠ ∅ ──
        List<ExchangeGraphNode> nodeList = new ArrayList<>(nodes.values());
        int edgesAdded = 0;

        for (ExchangeGraphNode nodeA : nodeList) {
            if (nodeA.wantedSkillIds().isEmpty()) continue;  // A wants nothing → no outgoing edges

            for (ExchangeGraphNode nodeB : nodeList) {
                if (nodeA.userId().equals(nodeB.userId())) continue; // skip self
                if (nodeB.offeredSkillIds().isEmpty())     continue; // B offers nothing → no edge

                Set<String> matching = nodeA.matchingSkillsWith(nodeB);
                if (!matching.isEmpty()) {
                    graph.addEdge(new ExchangeGraphEdge(
                        nodeA.userId(),
                        nodeB.userId(),
                        matching
                    ));
                    edgesAdded++;
                }
            }
        }

        log.debug("ExchangeGraphBuilder: built {} — {} nodes, {} edges",
            graph, nodes.size(), edgesAdded);
        return graph;
    }

    /**
     * Build a <b>local subgraph</b> centred on one user: the user, all users they
     * can reach in one hop (direct neighbours), and all edges among those nodes.
     *
     * <p>Much cheaper than a full build for on-demand queries
     * (e.g. showing potential chains to a single user on the match page).
     *
     * @param userId  the focal user ID
     * @param maxHops maximum BFS depth (1 = direct neighbours only, 2 = two-hop)
     * @return subgraph rooted at {@code userId}
     */
    @Transactional(readOnly = true)
    public ExchangeGraph buildSubgraph(String userId, int maxHops) {
        // Build the full graph and extract the relevant subgraph.
        // For larger scale, this should be replaced with a targeted DB query.
        ExchangeGraph full = build();
        return extractSubgraph(full, userId, maxHops);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    /**
     * Merge two user lists (one with offered skills, one with wanted skills)
     * into a single {@link ExchangeGraphNode} map keyed by user ID.
     *
     * <p>A user present in only one list (edge case: no offered or no wanted
     * skills at all) is still included with an empty set for the missing side.
     */
    private Map<String, ExchangeGraphNode> mergeIntoNodes(
            List<User> withOffered, List<User> withWanted) {

        // Collect offered skills by user ID
        Map<String, Set<String>> offeredMap = new HashMap<>();
        Map<String, String>      nameMap    = new HashMap<>();

        for (User u : withOffered) {
            offeredMap.put(u.getId(), skillIds(u.getSkillsOffered()));
            nameMap.put(u.getId(), u.getName());
        }

        // Collect wanted skills by user ID
        Map<String, Set<String>> wantedMap = new HashMap<>();
        for (User u : withWanted) {
            wantedMap.put(u.getId(), skillIds(u.getSkillsWanted()));
            nameMap.putIfAbsent(u.getId(), u.getName());
        }

        // Union of all known user IDs
        Set<String> allIds = new HashSet<>(offeredMap.keySet());
        allIds.addAll(wantedMap.keySet());

        Map<String, ExchangeGraphNode> result = new LinkedHashMap<>(allIds.size());
        for (String uid : allIds) {
            result.put(uid, new ExchangeGraphNode(
                uid,
                nameMap.getOrDefault(uid, uid),
                offeredMap.getOrDefault(uid, Collections.emptySet()),
                wantedMap.getOrDefault(uid, Collections.emptySet())
            ));
        }
        return result;
    }

    /**
     * BFS extraction of a subgraph up to {@code maxHops} from {@code rootId}.
     */
    private ExchangeGraph extractSubgraph(ExchangeGraph full, String rootId, int maxHops) {
        ExchangeGraph sub = new ExchangeGraph();

        Set<String> visited = new LinkedHashSet<>();
        Deque<String> queue = new ArrayDeque<>();
        Map<String, Integer> depth = new HashMap<>();

        queue.add(rootId);
        depth.put(rootId, 0);

        while (!queue.isEmpty()) {
            String current = queue.poll();
            if (visited.contains(current)) continue;
            visited.add(current);

            full.getNode(current).ifPresent(sub::addNode);

            int currentDepth = depth.getOrDefault(current, 0);
            if (currentDepth < maxHops) {
                for (ExchangeGraphEdge edge : full.outgoingEdges(current)) {
                    String neighbour = edge.toUserId();
                    if (!visited.contains(neighbour)) {
                        depth.putIfAbsent(neighbour, currentDepth + 1);
                        queue.add(neighbour);
                    }
                }
            }
        }

        // Add edges that exist between any two visited nodes
        for (String from : visited) {
            for (ExchangeGraphEdge edge : full.outgoingEdges(from)) {
                if (visited.contains(edge.toUserId())) {
                    sub.addEdge(edge);
                }
            }
        }

        return sub;
    }

    private static Set<String> skillIds(List<Skill> skills) {
        return skills.stream()
            .map(Skill::getId)
            .collect(Collectors.toCollection(LinkedHashSet::new));
    }
}
