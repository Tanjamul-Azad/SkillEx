package com.skillex.service.match.graph;

import java.util.List;
import java.util.Set;

/**
 * Represents a <b>circular skill-exchange chain</b> detected in the graph.
 *
 * <h3>What is a chain?</h3>
 * A chain is a directed cycle in the exchange graph:
 * <pre>
 *   A → B → C → A
 * </pre>
 * meaning:
 * <ul>
 *   <li>A wants a skill that B offers</li>
 *   <li>B wants a skill that C offers</li>
 *   <li>C wants a skill that A offers</li>
 * </ul>
 * Such a three-way arrangement lets all participants teach and learn
 * without requiring any direct pair to offer what the other wants.
 *
 * <h3>Fields</h3>
 * <ul>
 *   <li>{@code userIds} — ordered list of participant user IDs.
 *       The last user in the list closes the cycle back to the first.</li>
 *   <li>{@code userNames} — display names corresponding to each user ID.</li>
 *   <li>{@code skillsPerHop} — for hop {@code i}, the set of skill IDs that
 *       {@code userIds.get(i)} wants from {@code userIds.get(i+1 % size)}.</li>
 * </ul>
 *
 * <p>This is intentionally a <i>plain record</i> — no Spring annotations —
 * so it can be serialised to JSON unmodified via Jackson.
 *
 * @see ExchangeChainDetector
 */
public record ExchangeChain(
    List<String>      userIds,
    List<String>      userNames,
    List<Set<String>> skillsPerHop
) {

    /** Compact constructor — defensive copies to keep the record immutable. */
    public ExchangeChain {
        userIds      = List.copyOf(userIds);
        userNames    = List.copyOf(userNames);
        skillsPerHop = skillsPerHop.stream()
            .map(Set::copyOf)
            .collect(java.util.stream.Collectors.toUnmodifiableList());
    }

    /** Number of participants in this chain (3 for a classic triangular chain). */
    public int length() {
        return userIds.size();
    }

    /**
     * Human-readable summary: {@code "Alice → Bob → Carol → Alice"}.
     * Useful for logs and debugging.
     */
    @Override
    public String toString() {
        if (userNames.isEmpty()) return "[]";
        String path = String.join(" → ", userNames);
        return path + " → " + userNames.get(0);
    }
}
