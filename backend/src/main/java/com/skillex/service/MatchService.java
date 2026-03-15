package com.skillex.service;

import com.skillex.dto.user.MatchUserDto;
import com.skillex.service.match.graph.ExchangeChain;
import com.skillex.service.match.graph.ExchangeCycle;
import com.skillex.service.match.graph.ScoredCycle;

import java.util.List;

/**
 * Contract for the skill-matching algorithm.
 *
 * Compatibility score formula (max 100):
 *   sharedSkillOverlap × 20 + rating × 10 + min(skillexScore / 10, 20)
 */
public interface MatchService {

    List<MatchUserDto> findMatches(String userId, int limit);

    /**
     * Find circular exchange chains involving {@code userId} (Phase 4).
     *
     * @param userId  the requesting user's ID
     * @return list of {@link ExchangeChain}s, may be empty
     */
    List<ExchangeChain> findChains(String userId);

    /**
     * Find directed exchange cycles involving {@code userId} using DFS
     * with a three-colour visited + recursion-stack marking scheme (Step 7).
     *
     * <p>Each returned {@link ExchangeCycle} carries fully enriched hops
     * — user names and skill names resolved — so the caller needs no
     * further lookups.
     *
     * @param userId  the requesting user's ID
     * @return list of {@link ExchangeCycle}s involving this user, may be empty
     */
    List<ExchangeCycle> findCycles(String userId);

    /**
     * Find and rank the top exchange cycles involving {@code userId} using
     * the Step 8 CycleScore formula:
     * <pre>
     *   CycleScore = (averageRating × 40) + (skillMatchQuality × 35) + (sessionAvailability × 25)
     * </pre>
     *
     * @param userId the requesting user's ID
     * @param limit  maximum number of top cycles to return
     * @return top {@link ScoredCycle}s sorted by score descending
     */
    List<ScoredCycle> findTopCycles(String userId, int limit);
}
