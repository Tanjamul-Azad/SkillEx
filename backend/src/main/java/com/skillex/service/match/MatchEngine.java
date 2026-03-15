package com.skillex.service.match;

import com.skillex.dto.user.MatchUserDto;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;

/**
 * Central orchestrator for the skill-matching system.
 *
 * {@code MatchEngine} selects the appropriate {@link MatchStrategy} at runtime
 * and delegates execution to it. This decouples the caller ({@code MatchServiceImpl})
 * from any specific algorithm.
 *
 * <p>Strategy selection is governed by {@link StrategyType}:
 * <ul>
 *   <li>{@link StrategyType#BASIC} — original overlap-based formula</li>
 *   <li>{@link StrategyType#SMART} — multi-factor scoring with expanded candidate
 *       pool, directional weighting, mutual bonus, and activity signals</li>
 * </ul>
 *
 * <p>The no-arg {@link #run(UUID, int)} overload defaults to {@link StrategyType#SMART}.
 *
 * <h3>OOP Pattern</h3>
 * Implements the <b>Strategy Pattern</b>: both concrete strategies implement the
 * same {@link MatchStrategy} interface; the engine holds references to all strategies
 * and selects among them based on the {@code StrategyType} enum parameter.
 *
 * @see MatchStrategy
 * @see BasicMatchStrategy
 * @see SmartMatchStrategy
 */
@Component
@RequiredArgsConstructor
public class MatchEngine {

    private final BasicMatchStrategy basicStrategy;
    private final SmartMatchStrategy smartStrategy;

    // ── Strategy selector ─────────────────────────────────────────────────

    /**
     * Supported matching strategies.
     * Adding a new algorithm requires only:
     * <ol>
     *   <li>A new {@link MatchStrategy} implementation annotated {@code @Component}</li>
     *   <li>A new enum constant here</li>
     *   <li>A new {@code case} in {@link #selectStrategy(StrategyType)}</li>
     * </ol>
     */
    public enum StrategyType {
        /** Original formula: overlap × 20 + rating × 10 + min(skillexScore/10, 20). */
        BASIC,
        /** Enhanced: directional scoring, mutual bonus, reputation, activity signals. */
        SMART
    }

    // ── Public API ────────────────────────────────────────────────────────

    /**
     * Run the default strategy (SMART) for the given user.
     *
     * @param userId  authenticated user UUID
     * @param limit   maximum number of results
     * @return ranked match list
     */
    public List<MatchUserDto> run(UUID userId, int limit) {
        return run(userId, limit, StrategyType.SMART);
    }

    /**
     * Run with an explicitly selected strategy.
     *
     * @param userId       authenticated user UUID
     * @param limit        maximum number of results
     * @param strategyType which algorithm to use
     * @return ranked match list
     */
    public List<MatchUserDto> run(UUID userId, int limit, StrategyType strategyType) {
        return selectStrategy(strategyType).findMatches(userId, limit);
    }

    // ── Private ───────────────────────────────────────────────────────────

    private MatchStrategy selectStrategy(StrategyType type) {
        return switch (type) {
            case BASIC -> basicStrategy;
            case SMART -> smartStrategy;
        };
    }
}
