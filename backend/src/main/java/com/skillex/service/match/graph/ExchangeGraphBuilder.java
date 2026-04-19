package com.skillex.service.match.graph;

import com.skillex.model.Skill;
import com.skillex.model.User;
import com.skillex.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
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

    private static final int SUBGRAPH_POOL_PER_HOP = 300;
    private static final int SUBGRAPH_NODE_CAP = 900;
    private static final Duration FULL_GRAPH_CACHE_TTL = Duration.ofSeconds(45);

    private final UserRepository userRepository;
    private volatile ExchangeGraph cachedFullGraph;
    private volatile Instant cachedFullGraphAt = Instant.EPOCH;

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
        Instant now = Instant.now();
        ExchangeGraph cached = cachedFullGraph;
        if (cached != null && now.isBefore(cachedFullGraphAt.plus(FULL_GRAPH_CACHE_TTL))) {
            return cached;
        }

        synchronized (this) {
            now = Instant.now();
            cached = cachedFullGraph;
            if (cached != null && now.isBefore(cachedFullGraphAt.plus(FULL_GRAPH_CACHE_TTL))) {
                return cached;
            }

            log.debug("ExchangeGraphBuilder: starting full graph build");

            List<User> withOffered = userRepository.findAllWithOfferedSkills();
            List<User> withWanted  = userRepository.findAllWithWantedSkills();
            Map<String, ExchangeGraphNode> nodes = mergeIntoNodes(withOffered, withWanted);
            ExchangeGraph graph = buildGraphFromNodes(nodes);

            cachedFullGraph = graph;
            cachedFullGraphAt = now;

            log.debug("ExchangeGraphBuilder: built {} — {} nodes, {} edges",
                graph, nodes.size(), graph.edgeCount());
            return graph;
        }
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
        if (maxHops <= 0) {
            return buildGraphFromNodes(loadNodes(Set.of(userId)));
        }

        Set<String> discovered = new LinkedHashSet<>();
        discovered.add(userId);

        Set<String> frontier = new LinkedHashSet<>();
        frontier.add(userId);

        for (int hop = 0; hop < maxHops && !frontier.isEmpty() && discovered.size() < SUBGRAPH_NODE_CAP; hop++) {
            Map<String, ExchangeGraphNode> frontierNodes = loadNodes(frontier);
            if (frontierNodes.isEmpty()) {
                break;
            }

            Set<String> wantedSeeds = new LinkedHashSet<>();
            Set<String> offeredSeeds = new LinkedHashSet<>();
            for (ExchangeGraphNode node : frontierNodes.values()) {
                wantedSeeds.addAll(node.wantedSkillIds());
                offeredSeeds.addAll(node.offeredSkillIds());
            }

            Set<String> hopCandidates = discoverCandidateIds(userId, wantedSeeds, offeredSeeds);
            hopCandidates.removeAll(discovered);
            if (hopCandidates.isEmpty()) {
                break;
            }

            int remainingSlots = Math.max(0, SUBGRAPH_NODE_CAP - discovered.size());
            Set<String> bounded = hopCandidates.stream()
                .limit(remainingSlots)
                .collect(Collectors.toCollection(LinkedHashSet::new));

            discovered.addAll(bounded);
            frontier = bounded;
        }

        Map<String, ExchangeGraphNode> nodes = loadNodes(discovered);
        ExchangeGraph subgraph = buildGraphFromNodes(nodes);
        log.debug("ExchangeGraphBuilder: built subgraph for user {} with {} nodes and {} edges",
            userId, subgraph.nodeCount(), subgraph.edgeCount());
        return subgraph;
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

    private Map<String, ExchangeGraphNode> loadNodes(Set<String> userIds) {
        if (userIds == null || userIds.isEmpty()) {
            return Map.of();
        }
        List<User> withOffered = userRepository.findAllWithOfferedSkillsByIds(userIds);
        List<User> withWanted = userRepository.findAllWithWantedSkillsByIds(userIds);
        return mergeIntoNodes(withOffered, withWanted);
    }

    private Set<String> discoverCandidateIds(String rootUserId, Set<String> wantedSeeds, Set<String> offeredSeeds) {
        Set<String> ids = new LinkedHashSet<>();

        if (!wantedSeeds.isEmpty()) {
            ids.addAll(userRepository.findMatchCandidates(
                rootUserId,
                wantedSeeds,
                PageRequest.of(0, SUBGRAPH_POOL_PER_HOP)
            ));
        }

        if (!offeredSeeds.isEmpty()) {
            ids.addAll(userRepository.findCandidatesByWantedSkills(
                rootUserId,
                offeredSeeds,
                PageRequest.of(0, SUBGRAPH_POOL_PER_HOP)
            ));
        }

        return ids;
    }

    private ExchangeGraph buildGraphFromNodes(Map<String, ExchangeGraphNode> nodes) {
        ExchangeGraph graph = new ExchangeGraph();
        for (ExchangeGraphNode node : nodes.values()) {
            graph.addNode(node);
        }

        List<ExchangeGraphNode> nodeList = new ArrayList<>(nodes.values());
        for (ExchangeGraphNode fromNode : nodeList) {
            if (fromNode.wantedSkillIds().isEmpty()) {
                continue;
            }
            for (ExchangeGraphNode toNode : nodeList) {
                if (fromNode.userId().equals(toNode.userId()) || toNode.offeredSkillIds().isEmpty()) {
                    continue;
                }
                Set<String> matching = fromNode.matchingSkillsWith(toNode);
                if (!matching.isEmpty()) {
                    graph.addEdge(new ExchangeGraphEdge(fromNode.userId(), toNode.userId(), matching));
                }
            }
        }

        return graph;
    }

    private static Set<String> skillIds(List<Skill> skills) {
        return skills.stream()
            .map(Skill::getId)
            .collect(Collectors.toCollection(LinkedHashSet::new));
    }
}
