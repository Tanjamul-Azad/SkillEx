package com.skillex.service.match.graph;

import java.util.Set;

/**
 * One directed hop inside an {@link ExchangeCycle}.
 *
 * <p>A hop represents the relationship:
 * <pre>
 *   "{fromUserName} teaches {primarySkillName} → {toUserName}"
 * </pre>
 *
 * <h3>Fields</h3>
 * <ul>
 *   <li>{@code fromUserId} / {@code fromUserName} — the teaching participant.</li>
 *   <li>{@code toUserId}   / {@code toUserName}   — the receiving participant.</li>
 *   <li>{@code matchingSkillIds}  — all skill IDs that the receiver wants and
 *       the teacher offers on this hop (may be more than one).</li>
 *   <li>{@code primarySkillName} — the first / most representative skill name,
 *       used for human-readable descriptions and the UI label.</li>
 * </ul>
 *
 * <p>Instances are created exclusively by {@link ExchangeCycleFinder}; they are
 * immutable value objects suitable for direct JSON serialisation.
 *
 * @see ExchangeCycle
 * @see ExchangeCycleFinder
 */
public record ExchangeCycleHop(
    String      fromUserId,
    String      fromUserName,
    String      toUserId,
    String      toUserName,
    Set<String> matchingSkillIds,
    String      primarySkillName
) {

    /** Compact constructor — defensive copy for the mutable skill-ID set. */
    public ExchangeCycleHop {
        matchingSkillIds = Set.copyOf(matchingSkillIds);
    }

    /**
     * One-line description matching the user-visible format:
     * <pre>
     *   "Alice teaches Python → Bob"
     * </pre>
     */
    public String describe() {
        return fromUserName + " teaches " + primarySkillName + " → " + toUserName;
    }
}
