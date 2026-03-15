package com.skillex.service.match;

import com.skillex.dto.user.MatchUserDto;

import java.util.List;
import java.util.UUID;

/**
 * Strategy interface for the skill-matching algorithm.
 *
 * Following the Strategy Pattern (AOOP), each implementation encapsulates a distinct
 * scoring algorithm. Implementations are Spring-managed @Components and injected
 * into {@link MatchEngine}, which selects the appropriate strategy at runtime.
 *
 * @see BasicMatchStrategy
 * @see SmartMatchStrategy
 */
public interface MatchStrategy {

    /**
     * Compute ranked match candidates for the given user.
     *
     * @param userId UUID of the authenticated user requesting matches
     * @param limit  maximum number of results to return
     * @return ranked list of {@link MatchUserDto}, highest compatibility first
     */
    List<MatchUserDto> findMatches(UUID userId, int limit);
}
