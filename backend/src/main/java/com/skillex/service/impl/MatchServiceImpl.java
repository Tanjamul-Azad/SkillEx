package com.skillex.service.impl;

import com.skillex.dto.user.MatchUserDto;
import com.skillex.service.MatchService;
import com.skillex.service.match.MatchEngine;
import com.skillex.service.match.graph.CycleScorer;
import com.skillex.service.match.graph.ExchangeChain;
import com.skillex.service.match.graph.ExchangeChainDetector;
import com.skillex.service.match.graph.ExchangeCycle;
import com.skillex.service.match.graph.ExchangeCycleFinder;
import com.skillex.service.match.graph.ExchangeGraphBuilder;
import com.skillex.service.match.graph.ScoredCycle;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

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

    @Override
    public List<MatchUserDto> findMatches(String userId, int limit) {
        return matchEngine.run(UUID.fromString(userId), limit);
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
