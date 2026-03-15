package com.skillex.service.match.graph;

import java.util.Set;

/**
 * Immutable snapshot of a user node in the exchange graph.
 *
 * <p>Stores only what the graph algorithm needs (IDs, name, skill sets)
 * — not the full JPA entity — so the graph can be held in memory without
 * a Hibernate session.
 *
 * <p>Skill ID sets are copied defensively at construction time.
 *
 * @param userId           the user's UUID string (primary key)
 * @param name             display name — useful for chain result rendering
 * @param offeredSkillIds  IDs of skills this user can teach
 * @param wantedSkillIds   IDs of skills this user wants to learn
 */
public record ExchangeGraphNode(
    String      userId,
    String      name,
    Set<String> offeredSkillIds,
    Set<String> wantedSkillIds
) {

    /**
     * Compact constructor — defensively copies the mutable sets passed in.
     */
    public ExchangeGraphNode {
        offeredSkillIds = Set.copyOf(offeredSkillIds);
        wantedSkillIds  = Set.copyOf(wantedSkillIds);
    }

    /**
     * Returns {@code true} if this user wants to learn at least one skill
     * that {@code other} offers — i.e. there should be a directed edge
     * {@code this → other} in the exchange graph.
     */
    public boolean wantsSkillFrom(ExchangeGraphNode other) {
        return other.offeredSkillIds().stream()
            .anyMatch(wantedSkillIds::contains);
    }

    /**
     * Returns the intersection: skill IDs that this user wants and {@code other} offers.
     * Used to annotate the edge with the concrete skills that caused the connection.
     */
    public Set<String> matchingSkillsWith(ExchangeGraphNode other) {
        return other.offeredSkillIds().stream()
            .filter(wantedSkillIds::contains)
            .collect(java.util.stream.Collectors.toUnmodifiableSet());
    }
}
