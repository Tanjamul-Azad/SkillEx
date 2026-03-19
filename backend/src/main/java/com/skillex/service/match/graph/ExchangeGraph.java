package com.skillex.service.match.graph;

import java.util.*;

/**
 * In-memory directed graph of skill-exchange relationships.
 *
 * <h3>Structure</h3>
 * <ul>
 *   <li><b>Nodes</b> — one per user: {@code Map<userId, ExchangeGraphNode>}</li>
 *   <li><b>Adjacency list</b> — outgoing edges per user:
 *       {@code Map<userId, List<ExchangeGraphEdge>>}</li>
 * </ul>
 *
 * An edge {@code A → B} means: "User A wants a skill that User B offers."
 *
 * <h3>Building the graph</h3>
 * Graphs are not constructed directly — use {@link ExchangeGraphBuilder}.
 *
 * <h3>Traversal</h3>
 * The graph exposes read-only views and traversal helpers used by chain
 * detection algorithms (e.g. BFS/DFS for 3-way exchange cycles).
 *
 * <h3>OOP notes</h3>
 * <ul>
 *   <li>Encapsulation: internal maps are never exposed directly —
 *       callers receive unmodifiable views</li>
 *   <li>Single Responsibility: graph structure only — no scoring, no DB access</li>
 * </ul>
 */
public class ExchangeGraph {

    /** All users in the graph, keyed by user ID. */
    private final Map<String, ExchangeGraphNode> nodes = new LinkedHashMap<>();

    /**
     * Outgoing edge lists — an edge A→B is stored under key A.
     * A user with no outgoing edges may still appear in this map with an empty list.
     */
    private final Map<String, List<ExchangeGraphEdge>> adjacency = new LinkedHashMap<>();

    // ── Mutation (package-private — only ExchangeGraphBuilder should call these) ──

    /**
     * Register a user node. If the node already exists, it is replaced.
     *
     * @param node the user node to add
     */
    void addNode(ExchangeGraphNode node) {
        nodes.put(node.userId(), node);
        adjacency.putIfAbsent(node.userId(), new ArrayList<>());
    }

    /**
     * Add a directed edge. Both endpoints must already be registered via
     * {@link #addNode} before calling this method.
     *
     * @param edge the directed edge to add
     * @throws IllegalStateException if either endpoint node is missing
     */
    void addEdge(ExchangeGraphEdge edge) {
        if (!nodes.containsKey(edge.fromUserId())) {
            throw new IllegalStateException(
                "Source node not in graph: " + edge.fromUserId());
        }
        if (!nodes.containsKey(edge.toUserId())) {
            throw new IllegalStateException(
                "Target node not in graph: " + edge.toUserId());
        }
        adjacency.get(edge.fromUserId()).add(edge);
    }

    // ── Read API ──────────────────────────────────────────────────────────────

    /**
     * Look up a node by user ID.
     *
     * @param userId user ID
     * @return {@link Optional} containing the node, or empty if not present
     */
    public Optional<ExchangeGraphNode> getNode(String userId) {
        return Optional.ofNullable(nodes.get(userId));
    }

    /**
     * Unmodifiable view of all nodes.
     *
     * @return map of userId → node
     */
    public Map<String, ExchangeGraphNode> allNodes() {
        return Collections.unmodifiableMap(nodes);
    }

    /**
     * Outgoing edges from a given user (users this user can exchange with).
     *
     * @param userId source user ID
     * @return unmodifiable list of outgoing edges; empty list if user has none or is absent
     */
    public List<ExchangeGraphEdge> outgoingEdges(String userId) {
        return Collections.unmodifiableList(
            adjacency.getOrDefault(userId, Collections.emptyList()));
    }

    /**
     * Neighbour IDs: all users that {@code userId} can directly request an exchange with.
     *
     * @param userId source user ID
     * @return set of reachable user IDs (direct neighbours)
     */
    public Set<String> neighbours(String userId) {
        List<ExchangeGraphEdge> edges = adjacency.getOrDefault(userId, Collections.emptyList());
        Set<String> result = new LinkedHashSet<>(edges.size());
        for (ExchangeGraphEdge e : edges) {
            result.add(e.toUserId());
        }
        return Collections.unmodifiableSet(result);
    }

    /**
     * Returns {@code true} if a direct edge {@code fromUserId → toUserId} exists.
     */
    public boolean hasEdge(String fromUserId, String toUserId) {
        return adjacency.getOrDefault(fromUserId, Collections.emptyList())
            .stream()
            .anyMatch(e -> e.toUserId().equals(toUserId));
    }

    // ── Statistics ────────────────────────────────────────────────────────────

    /** Number of user nodes in the graph. */
    public int nodeCount() {
        return nodes.size();
    }

    /** Total number of directed edges in the graph. */
    public int edgeCount() {
        return adjacency.values().stream()
            .mapToInt(List::size)
            .sum();
    }

    @Override
    public String toString() {
        return "ExchangeGraph{nodes=" + nodeCount() + ", edges=" + edgeCount() + "}";
    }
}
