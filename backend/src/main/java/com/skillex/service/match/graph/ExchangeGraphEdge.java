package com.skillex.service.match.graph;

import java.util.Set;

/**
 * Directed edge in the exchange graph.
 *
 * <p>An edge {@code fromUserId → toUserId} exists when the "from" user wants
 * at least one skill that the "to" user offers.
 *
 * <p>The edge carries the set of skills that caused the connection
 * ({@code matchingSkillIds}) so chain algorithms can explain why two users
 * were linked without re-querying the database.
 *
 * <h3>Semantics</h3>
 * <pre>
 *   fromUser —[wants: {Design}]→ toUser
 *   means: fromUser wants Design, toUser offers Design
 * </pre>
 *
 * @param fromUserId      the user who wants a skill (edge origin)
 * @param toUserId        the user who offers that skill (edge destination)
 * @param matchingSkillIds skill IDs that triggered this edge (non-empty)
 */
public record ExchangeGraphEdge(
    String      fromUserId,
    String      toUserId,
    Set<String> matchingSkillIds
) {

    /** Compact constructor — defensively copies the skill set. */
    public ExchangeGraphEdge {
        if (matchingSkillIds == null || matchingSkillIds.isEmpty()) {
            throw new IllegalArgumentException(
                "ExchangeGraphEdge must have at least one matching skill");
        }
        matchingSkillIds = Set.copyOf(matchingSkillIds);
    }
}
