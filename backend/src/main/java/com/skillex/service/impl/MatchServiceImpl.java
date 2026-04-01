package com.skillex.service.impl;

import com.skillex.dto.user.MatchUserDto;
import com.skillex.dto.user.MatchCompatibilityDto;
import com.skillex.model.User;
import com.skillex.repository.UserRepository;
import com.skillex.service.MatchService;
import com.skillex.service.match.MatchEngine;
import com.skillex.service.match.CompatibilityCalculator;
import com.skillex.service.match.graph.CycleScorer;
import com.skillex.service.match.graph.ExchangeChain;
import com.skillex.service.match.graph.ExchangeChainDetector;
import com.skillex.service.match.graph.ExchangeCycle;
import com.skillex.service.match.graph.ExchangeCycleFinder;
import com.skillex.service.match.graph.ExchangeGraphBuilder;
import com.skillex.service.match.MatchResultCache;
import com.skillex.service.match.graph.ScoredCycle;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityNotFoundException;

import java.util.List;
import java.util.UUID;

/**
 * Thin adapter that bridges the outer {@link MatchService} interface (String userId)
 * with the internal {@link MatchEngine} (UUID userId).
 *
 * All algorithm logic lives in:
 * <ul>
 *   <li>{@link com.skillex.service.match.BasicMatchStrategy} — original formula</li>
 *   <li>{@link com.skillex.service.match.SmartMatchStrategy} — enhanced multi-factor scoring</li>
 *   <li>{@link ExchangeChainDetector} — Phase 4 chain detection (backtracking DFS)</li>
 *   <li>{@link ExchangeCycleFinder}   — Step 7 cycle detection (three-colour DFS)</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
public class MatchServiceImpl implements MatchService {

    private final MatchEngine           matchEngine;
    private final ExchangeGraphBuilder  graphBuilder;
    private final ExchangeChainDetector chainDetector;
    private final ExchangeCycleFinder   cycleFinder;
    private final CycleScorer           cycleScorer;
    private final MatchResultCache      matchResultCache;
    private final UserRepository        userRepository;
    private final CompatibilityCalculator compatibilityCalculator;

    @Override
    public List<MatchUserDto> findMatches(String userId, int limit) {
        String cacheKey = userId + ":" + limit;
        List<MatchUserDto> cached = matchResultCache.get(cacheKey);
        if (cached != null) {
            return cached;
        }

        List<MatchUserDto> computed = matchEngine.run(UUID.fromString(userId), limit);
        matchResultCache.put(cacheKey, computed);
        return computed;
    }

    @Override
    @Transactional(readOnly = true)
    public MatchCompatibilityDto getCompatibility(String userId, String targetUserId) {
        User viewer = userRepository.findById(userId)
            .orElseThrow(() -> new EntityNotFoundException("User not found: " + userId));
        User candidate = userRepository.findById(targetUserId)
            .orElseThrow(() -> new EntityNotFoundException("User not found: " + targetUserId));

        CompatibilityCalculator.CompatibilityBreakdown breakdown = compatibilityCalculator.analyze(viewer, candidate);
        return new MatchCompatibilityDto(
            candidate.getId(),
            breakdown.finalScore(),
            (int) Math.round(breakdown.semanticSimilarity() * 100),
            (int) Math.round(breakdown.intentSimilarity() * 100)
        );
    }

    @Override
    public List<ExchangeChain> findChains(String userId) {
        return chainDetector.findChainsForUser(userId, graphBuilder);
    }

    @Override
    public List<ExchangeCycle> findCycles(String userId) {
        return cycleFinder.findCyclesForUser(userId, graphBuilder);
    }

    @Override
    public List<ScoredCycle> findTopCycles(String userId, int limit) {
        // Scan the full exchange graph so we surface all system-wide cycles, not just
        // the 2-hop subgraph of one user.  Results are ranked; the caller (frontend)
        // highlights cycles that contain the requesting user.
        List<ExchangeCycle> allCycles = cycleFinder.findCycles(graphBuilder.build());
        return cycleScorer.rankCycles(allCycles, limit);
    }
}
