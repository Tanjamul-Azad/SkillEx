package com.skillex.service.match.graph;

import java.util.List;
import java.util.stream.Collectors;

/**
 * A complete circular skill-exchange cycle detected in the exchange graph.
 *
 * <h3>What it represents</h3>
 * A directed cycle where every participant both teaches one person and learns
 * from another — for example a three-way ring:
 * <pre>
 *   Alice teaches Python  → Bob
 *   Bob   teaches UI      → Carol
 *   Carol teaches Marketing → Alice
 * </pre>
 *
 * Nobody in the ring needs to offer exactly what their direct counterpart
 * wants — the chain closes the gap, making otherwise impossible exchanges
 * possible.
 *
 * <h3>Fields</h3>
 * <ul>
 *   <li>{@code userIds}   — ordered participant IDs; last element closes
 *       the cycle back to first.</li>
 *   <li>{@code userNames} — display names, index-aligned with {@code userIds}.</li>
 *   <li>{@code hops}      — one {@link ExchangeCycleHop} per edge in the cycle,
 *       each carrying the teaching direction and primary skill name.</li>
 * </ul>
 *
 * <h3>How it differs from {@link ExchangeChain}</h3>
 * {@code ExchangeChain} (Phase 4) stores raw skill-ID sets per hop.
 * {@code ExchangeCycle} (Step 7) stores fully enriched {@link ExchangeCycleHop}
 * records — including resolved skill <em>names</em> — and provides a
 * human-readable {@link #describe()} method, making it directly renderable
 * without a second lookup on the frontend.
 *
 * <h3>OOP notes</h3>
 * Immutable record — safe to cache, serialise, or pass across threads.
 * Created exclusively by {@link ExchangeCycleFinder}.
 *
 * @see ExchangeCycleHop
 * @see ExchangeCycleFinder
 */
public record ExchangeCycle(
    List<String>          userIds,
    List<String>          userNames,
    List<ExchangeCycleHop> hops
) {

    /** Compact constructor — defensive copies for all mutable lists. */
    public ExchangeCycle {
        userIds   = List.copyOf(userIds);
        userNames = List.copyOf(userNames);
        hops      = List.copyOf(hops);
    }

    /** Number of participants (3 for the classic triangular exchange). */
    public int length() {
        return userIds.size();
    }

    /**
     * Multi-line human-readable description matching the format:
     * <pre>
     * Cycle:
     * Alice teaches Python     → Bob
     * Bob   teaches UI         → Carol
     * Carol teaches Marketing  → Alice
     * </pre>
     *
     * Each line is produced by {@link ExchangeCycleHop#describe()}.
     */
    public String describe() {
        String body = hops.stream()
            .map(ExchangeCycleHop::describe)
            .collect(Collectors.joining("\n"));
        return "Cycle:\n" + body;
    }

    /**
     * Single-line summary: {@code "Alice → Bob → Carol → Alice"}.
     * Useful for logs, debugging, and toast notifications.
     */
    @Override
    public String toString() {
        if (userNames.isEmpty()) return "[]";
        return String.join(" → ", userNames) + " → " + userNames.get(0);
    }
}
