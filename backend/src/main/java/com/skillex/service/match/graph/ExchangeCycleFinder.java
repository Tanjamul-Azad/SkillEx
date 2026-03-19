package com.skillex.service.match.graph;

import com.skillex.model.Skill;
import com.skillex.repository.SkillRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Detects <b>directed exchange cycles</b> in the skill-exchange graph using
 * a classic depth-first search with a three-colour visited marking scheme.
 *
 * <h3>Algorithm — DFS with three-colour marking</h3>
 * Each node is assigned one of three colours that track its DFS state:
 * <ul>
 *   <li><b>WHITE</b> — not yet visited.</li>
 *   <li><b>GRAY</b>  — currently on the active recursion stack
 *       (i.e. discovered but not yet fully explored).</li>
 *   <li><b>BLACK</b> — fully explored; all descendants have been visited.</li>
 * </ul>
 *
 * When the DFS reaches a GRAY node {@code v} from the current node {@code u},
 * a <b>back edge</b> {@code u → v} has been found.  Because {@code v} is still
 * on the active path, the segment of that path from {@code v} to {@code u}
 * forms a simple directed cycle.  The path itself doubles as the recursion
 * stack: no separate {@code recStack} array is needed.
 *
 * Pseudocode:
 * <pre>
 *   colour[all] = WHITE
 *   for each node u:
 *       if colour[u] == WHITE:
 *           dfs(u, path=[])
 *
 *   dfs(u, path):
 *       colour[u] = GRAY          // entering: u is now ON the recursion stack
 *       path.add(u)
 *       for each neighbour v of u:
 *           if colour[v] == WHITE:
 *               dfs(v, path)
 *           else if colour[v] == GRAY:
 *               // back edge u → v: v is in the current path
 *               cycle = path[ indexOf(v) .. end ]
 *               record(cycle)
 *           // BLACK: skip — fully explored, no new cycles
 *       path.remove(last)
 *       colour[u] = BLACK         // leaving: u is no longer on the stack
 * </pre>
 *
 * <h3>Deduplication</h3>
 * The same cycle can be discovered starting from any of its members.
 * A canonical form is computed by rotating the cycle until the
 * lexicographically smallest user ID is first, then joining with commas.
 * Only the first occurrence (by canonical key) is retained.
 *
 * <h3>Skill name enrichment</h3>
 * The graph stores only skill IDs.  Before detecting cycles, this finder
 * loads a {@code Map<skillId, skillName>} from the database in a single
 * query, then resolves names when building each {@link ExchangeCycleHop}.
 *
 * <h3>OOP notes</h3>
 * <ul>
 *   <li>Single Responsibility: only cycle detection and hop enrichment</li>
 *   <li>Open/Closed: future enhancements (e.g. 4-cycle detection, scoring)
 *       add new methods without changing the core DFS</li>
 *   <li>Dependency Inversion: depends on repository abstraction, not impl</li>
 * </ul>
 *
 * @see ExchangeGraph
 * @see ExchangeCycle
 * @see ExchangeCycleHop
 * @see ExchangeGraphBuilder
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ExchangeCycleFinder {

    private final SkillRepository skillRepository;

    // ── DFS node colours ─────────────────────────────────────────────────────

    /**
     * Three-colour marking used by the DFS to distinguish node states.
     *
     * <ul>
     *   <li>{@code WHITE} — not yet discovered</li>
     *   <li>{@code GRAY}  — on the active recursion stack</li>
     *   <li>{@code BLACK} — fully processed, all descendants explored</li>
     * </ul>
     */
    private enum Color { WHITE, GRAY, BLACK }

    // ── Public API ────────────────────────────────────────────────────────────

    /**
     * Find all directed simple cycles in the entire {@code graph}.
     *
     * <p>This is the core algorithm entry point.  It iterates over every node
     * as a potential DFS root (ensuring all connected components are covered),
     * accumulates discovered cycles, deduplicates them, and returns them sorted
     * by length then by the first participant's user ID.
     *
     * <p>Skill names are resolved in a single DB query before the traversal.
     *
     * @param graph fully built exchange graph
     * @return deduplicated, sorted list of all {@link ExchangeCycle}s
     */
    @Transactional(readOnly = true)
    public List<ExchangeCycle> findCycles(ExchangeGraph graph) {
        Map<String, String> skillNames = loadSkillNames();

        // colour[node] = WHITE (absent) | GRAY | BLACK
        Map<String, Color>  colour    = new HashMap<>();
        // Active path = current DFS stack trace (also acts as the recursion stack)
        List<String>        path      = new ArrayList<>();
        // Canonical keys of already-recorded cycles (for deduplication)
        Set<String>         seenKeys  = new LinkedHashSet<>();
        List<ExchangeCycle> cycles    = new ArrayList<>();

        for (String nodeId : graph.allNodes().keySet()) {
            if (colour.getOrDefault(nodeId, Color.WHITE) == Color.WHITE) {
                dfs(graph, nodeId, path, colour, seenKeys, cycles, skillNames);
            }
        }

        cycles.sort(Comparator
            .comparingInt(ExchangeCycle::length)
            .thenComparing(c -> c.userIds().get(0)));

        log.debug("ExchangeCycleFinder: found {} cycle(s) in graph with {} node(s)",
            cycles.size(), graph.nodeCount());

        return cycles;
    }

    /**
     * Convenience method: build a 2-hop subgraph around {@code userId} and
     * return only the cycles that involve that user.
     *
     * <p>Much cheaper than a full-graph scan for per-user on-demand queries.
     *
     * @param userId  focal user ID
     * @param builder graph builder used to obtain (and scope) the graph
     * @return cycles involving {@code userId}, or an empty list
     */
    @Transactional(readOnly = true)
    public List<ExchangeCycle> findCyclesForUser(String userId, ExchangeGraphBuilder builder) {
        ExchangeGraph subgraph = builder.buildSubgraph(userId, 2);

        List<ExchangeCycle> all = findCycles(subgraph);

        List<ExchangeCycle> forUser = all.stream()
            .filter(c -> c.userIds().contains(userId))
            .collect(Collectors.toList());

        log.debug("findCyclesForUser({}): {}/{} cycles involve this user",
            userId, forUser.size(), all.size());

        return forUser;
    }

    // ── Core DFS ──────────────────────────────────────────────────────────────

    /**
     * Recursive DFS step.
     *
     * <p>On entry, {@code node} is painted <b>GRAY</b> (added to the recursion
     * stack) and pushed onto {@code path}.  For each neighbour {@code v}:
     * <ul>
     *   <li>WHITE → recurse</li>
     *   <li>GRAY  → back edge detected; extract and record the cycle</li>
     *   <li>BLACK → skip (fully explored; no new cycles reachable)</li>
     * </ul>
     * On exit, {@code node} is painted <b>BLACK</b> and popped from {@code path}.
     *
     * @param graph      the exchange graph being traversed
     * @param node       current node
     * @param path       current active DFS path (doubles as the recursion stack)
     * @param colour     per-node colour map
     * @param seenKeys   canonical cycle keys already recorded (deduplication)
     * @param cycles     accumulator for discovered cycles
     * @param skillNames skillId → skillName lookup for hop enrichment
     */
    private void dfs(
            ExchangeGraph       graph,
            String              node,
            List<String>        path,
            Map<String, Color>  colour,
            Set<String>         seenKeys,
            List<ExchangeCycle> cycles,
            Map<String, String> skillNames) {

        colour.put(node, Color.GRAY);   // mark as ON the recursion stack
        path.add(node);

        for (ExchangeGraphEdge edge : graph.outgoingEdges(node)) {
            String next      = edge.toUserId();
            Color  nextColor = colour.getOrDefault(next, Color.WHITE);

            if (nextColor == Color.WHITE) {
                // Tree edge: continue DFS
                dfs(graph, next, path, colour, seenKeys, cycles, skillNames);

            } else if (nextColor == Color.GRAY) {
                // Back edge (node → next): next is already on the active path.
                // The cycle runs from next's position in path to the current end.
                int          cycleStart = path.indexOf(next);
                List<String> cyclePath  = new ArrayList<>(
                    path.subList(cycleStart, path.size()));

                String canonicalKey = canonicalKey(cyclePath);
                if (seenKeys.add(canonicalKey)) {
                    cycles.add(buildCycle(graph, cyclePath, skillNames));
                }

            }
            // Color.BLACK: skip — already fully processed; no new cycles
        }

        // Backtrack: remove node from recursion stack and mark fully explored
        path.remove(path.size() - 1);
        colour.put(node, Color.BLACK);
    }

    // ── Cycle construction ────────────────────────────────────────────────────

    /**
     * Build an enriched {@link ExchangeCycle} from a raw cycle path.
     *
     * <p>The path {@code [A, B, C]} represents the cycle {@code A→B→C→A}.
     * The closing hop {@code C→A} is implicit — it is included in the hops
     * list via modular index arithmetic.
     *
     * @param graph      the exchange graph (used to look up edges and node names)
     * @param path       ordered list of user IDs forming the cycle
     * @param skillNames pre-loaded skillId → skillName map
     * @return fully enriched {@link ExchangeCycle}
     */
    private ExchangeCycle buildCycle(
            ExchangeGraph       graph,
            List<String>        path,
            Map<String, String> skillNames) {

        // Build a local name map for all nodes in this cycle (O(k) lookups)
        Map<String, String> nameMap = path.stream()
            .collect(Collectors.toMap(
                id -> id,
                id -> graph.getNode(id).map(ExchangeGraphNode::name).orElse(id)));

        List<String>          userNames = path.stream()
            .map(nameMap::get)
            .collect(Collectors.toList());

        List<ExchangeCycleHop> hops = new ArrayList<>(path.size());

        for (int i = 0; i < path.size(); i++) {
            String fromId   = path.get(i);
            String toId     = path.get((i + 1) % path.size()); // wraps: last → first

            String fromName = nameMap.get(fromId);
            String toName   = nameMap.get(toId);

            // Retrieve the matching skills on this directed edge
            Set<String> matchingIds = graph.outgoingEdges(fromId).stream()
                .filter(e -> e.toUserId().equals(toId))
                .findFirst()
                .map(ExchangeGraphEdge::matchingSkillIds)
                .orElse(Set.of());

            // Pick the primary skill name for display (first by natural order)
            String primarySkillName = matchingIds.stream()
                .sorted()
                .findFirst()
                .map(id -> skillNames.getOrDefault(id, id))
                .orElse("Unknown Skill");

            hops.add(new ExchangeCycleHop(
                fromId, fromName,
                toId,   toName,
                matchingIds,
                primarySkillName
            ));
        }

        return new ExchangeCycle(path, userNames, hops);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * Compute a canonical (rotation-invariant) key for a cycle so that
     * {@code [A, B, C]}, {@code [B, C, A]}, and {@code [C, A, B]} all
     * produce the same string, enabling deduplication.
     *
     * <p>Strategy: rotate the path until the lexicographically smallest
     * user ID is in position 0, then join with {@code ","}.
     */
    private String canonicalKey(List<String> path) {
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

    /**
     * Load all skills from the DB into a {@code skillId → skillName} map.
     * Executed once per {@link #findCycles} call; cheap for typical skill-catalogue sizes.
     */
    private Map<String, String> loadSkillNames() {
        return skillRepository.findAll().stream()
            .collect(Collectors.toMap(Skill::getId, Skill::getName));
    }
}
