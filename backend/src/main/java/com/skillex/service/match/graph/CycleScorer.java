package com.skillex.service.match.graph;

import com.skillex.model.User;
import com.skillex.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Scores and ranks {@link ExchangeCycle}s using the Step 8 formula.
 *
 * <h3>Formula (max 100)</h3>
 * <pre>
 *   CycleScore = (averageRating       × 40)
 *              + (skillMatchQuality   × 35)
 *              + (sessionAvailability × 25)
 * </pre>
 *
 * Each factor is normalised to [0.0, 1.0] before weighting.
 *
 * <h3>Factor definitions</h3>
 *
 * <p><b>averageRating (×40)</b><br>
 * The arithmetic mean of every participant's star rating divided by 5.0.
 * Rewards cycles where <em>all</em> members are experienced, well-reviewed
 * teachers — a weak teacher in the ring drags the mean down.
 *
 * <p><b>skillMatchQuality (×35)</b><br>
 * Per-hop quality: for each directed edge A→B in the cycle,
 * {@code min(1.0, |matchingSkillIds| / TARGET_SKILLS_PER_HOP)}.
 * A hop with ≥ 3 matching skills reaches the maximum (1.0).
 * The mean across all hops is taken as the cycle's quality.
 * This rewards rich, multi-skill overlaps that are more robust to schedule
 * conflicts (if one skill topic falls away the exchange can still proceed).
 *
 * <p><b>sessionAvailability (×25) — weakest link</b><br>
 * For each participant:
 * <pre>
 *   availability(p) = onlineFactor(p) + experienceFactor(p)   ∈ [0.0, 1.0]
 *
 *   onlineFactor(p)     = p.isOnline ? 0.50 : 0.20
 *   experienceFactor(p) = min(0.50, p.sessionsCompleted / 20.0)
 * </pre>
 * The cycle's availability is {@code min} over all participants — one
 * unavailable member breaks the chain, so the weakest link governs.
 *
 * <h3>Ranking</h3>
 * {@link #rankCycles(List, int)} returns the top-N cycles sorted by
 * {@code score DESC, length ASC} (shorter cycles with high scores first).
 *
 * <h3>OOP notes</h3>
 * <ul>
 *   <li>Single Responsibility: only scoring and ranking — cycle detection
 *       is the responsibility of {@link ExchangeCycleFinder}</li>
 *   <li>Open/Closed: re-weight factors by editing only the constants; add
 *       new factors with a new private method + constant, touching no callers</li>
 *   <li>Dependency Inversion: depends on {@link UserRepository} abstraction</li>
 * </ul>
 *
 * @see ScoredCycle
 * @see ExchangeCycleFinder
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class CycleScorer {

    // ── Weights (must sum to 100) ─────────────────────────────────────────────

    private static final double WEIGHT_RATING       = 40.0;
    private static final double WEIGHT_SKILL        = 35.0;
    private static final double WEIGHT_AVAILABILITY = 25.0;

    // ── Normalisation constants ───────────────────────────────────────────────

    /**
     * A hop with this many (or more) matching skill IDs receives the maximum
     * skill-match-quality score of 1.0 on that hop.
     */
    private static final double TARGET_SKILLS_PER_HOP = 3.0;

    /**
     * Sessions needed for a participant to reach maximum experience factor (0.50).
     */
    private static final double MAX_SESSIONS = 20.0;

    // ── Dependencies ─────────────────────────────────────────────────────────

    private final UserRepository userRepository;

    // ── Public API ────────────────────────────────────────────────────────────

    /**
     * Score a single {@link ExchangeCycle} and return the enriched {@link ScoredCycle}.
     *
     * <p>Loads all participant {@link User} entities in one {@code findAllById}
     * query — no N+1 problem.
     *
     * @param cycle the cycle to score
     * @return fully scored wrapper
     */
    @Transactional(readOnly = true)
    public ScoredCycle score(ExchangeCycle cycle) {
        Map<String, User> users = loadParticipants(cycle);

        double avgRating    = averageRating(cycle, users);
        double skillQuality = skillMatchQuality(cycle);
        double availability = sessionAvailability(cycle, users);

        double raw = (avgRating    * WEIGHT_RATING)
                   + (skillQuality * WEIGHT_SKILL)
                   + (availability * WEIGHT_AVAILABILITY);

        int total = (int) Math.min(100, Math.round(raw));

        log.debug("CycleScorer: {} → avgRating={:.2f} skillQuality={:.2f} avail={:.2f} score={}",
            cycle, avgRating, skillQuality, availability, total);

        return new ScoredCycle(cycle, avgRating, skillQuality, availability, total);
    }

    /**
     * Score all provided cycles and return the top {@code limit} ranked by
     * {@code score DESC}, with shorter cycles preferred at equal scores.
     *
     * @param cycles unranked cycles (typically from {@link ExchangeCycleFinder})
     * @param limit  maximum number of results to return
     * @return top-N {@link ScoredCycle}s, best first
     */
    @Transactional(readOnly = true)
    @SuppressWarnings("null")
    public List<ScoredCycle> rankCycles(List<ExchangeCycle> cycles, int limit) {
        if (cycles.isEmpty()) return List.of();

        // Load all unique participant users across all cycles in one query
        List<String> allIds = cycles.stream()
            .flatMap(c -> c.userIds().stream())
            .distinct()
            .collect(Collectors.toList());

        Map<String, User> userCache = userRepository.findAllById(allIds).stream()
            .collect(Collectors.toMap(User::getId, u -> u));

        return cycles.stream()
            .map(cycle -> scoreFast(cycle, userCache))
            .sorted(Comparator
                .comparingInt(ScoredCycle::score).reversed()
                .thenComparingInt(ScoredCycle::length))
            .limit(limit)
            .collect(Collectors.toList());
    }

    // ── Private helpers ────────────────────────────────────────────────────────

    /**
     * Score a cycle using a pre-loaded user cache — avoids repeated DB calls
     * when ranking many cycles at once via {@link #rankCycles}.
     */
    private ScoredCycle scoreFast(ExchangeCycle cycle, Map<String, User> userCache) {
        double avgRating    = averageRatingFromCache(cycle, userCache);
        double skillQuality = skillMatchQuality(cycle);
        double availability = sessionAvailabilityFromCache(cycle, userCache);

        double raw = (avgRating    * WEIGHT_RATING)
                   + (skillQuality * WEIGHT_SKILL)
                   + (availability * WEIGHT_AVAILABILITY);

        int total = (int) Math.min(100, Math.round(raw));
        return new ScoredCycle(cycle, avgRating, skillQuality, availability, total);
    }

    // ── Factor 1: averageRating ───────────────────────────────────────────────

    /**
     * Mean participant rating normalised to [0, 1].
     * <pre>
     *   averageRating = mean(participant.rating / 5.0)
     * </pre>
     * Participants missing from the user cache (edge case) contribute 0.0
     * to the mean so the formula degrades gracefully.
     */
    private double averageRating(ExchangeCycle cycle, Map<String, User> users) {
        return averageRatingFromCache(cycle, users);
    }

    private double averageRatingFromCache(ExchangeCycle cycle, Map<String, User> users) {
        double sum   = 0.0;
        int    count = 0;
        for (String uid : cycle.userIds()) {
            User u = users.get(uid);
            if (u != null && u.getRating() != null) {
                sum += Math.min(1.0, u.getRating().doubleValue() / 5.0);
            }
            count++;
        }
        return count == 0 ? 0.0 : sum / count;
    }

    // ── Factor 2: skillMatchQuality ───────────────────────────────────────────

    /**
     * Average per-hop skill overlap quality, normalised to [0, 1].
     *
     * <pre>
     *   hopQuality  = min(1.0, matchingSkillIds.size() / TARGET_SKILLS_PER_HOP)
     *   cycleQuality = mean(hopQuality over all hops)
     * </pre>
     *
     * Pure structural calculation — requires no DB access because
     * {@link ExchangeCycleHop} already carries the matching skill IDs.
     */
    private double skillMatchQuality(ExchangeCycle cycle) {
        List<ExchangeCycleHop> hops = cycle.hops();
        if (hops.isEmpty()) return 0.0;

        double total = 0.0;
        for (ExchangeCycleHop hop : hops) {
            double hopQuality = Math.min(1.0, hop.matchingSkillIds().size() / TARGET_SKILLS_PER_HOP);
            total += hopQuality;
        }
        return total / hops.size();
    }

    // ── Factor 3: sessionAvailability (weakest link) ─────────────────────────

    /**
     * Weakest-link availability across all participants.
     *
     * <pre>
     *   availability(p) = onlineFactor(p) + experienceFactor(p)
     *
     *   onlineFactor(p)     = p.isOnline ? 0.50 : 0.20
     *   experienceFactor(p) = min(0.50, p.sessionsCompleted / MAX_SESSIONS)
     *
     *   cycleAvailability   = min_{p ∈ participants} availability(p)
     * </pre>
     *
     * Using {@code min} means one unavailable participant correctly depresses
     * the whole cycle score — a chain is only as strong as its weakest link.
     */
    private double sessionAvailability(ExchangeCycle cycle, Map<String, User> users) {
        return sessionAvailabilityFromCache(cycle, users);
    }

    private double sessionAvailabilityFromCache(ExchangeCycle cycle, Map<String, User> users) {
        double weakest = 1.0;
        for (String uid : cycle.userIds()) {
            User u = users.get(uid);
            double avail = participantAvailability(u);
            if (avail < weakest) weakest = avail;
        }
        return weakest;
    }

    /**
     * Individual participant availability score in [0.0, 1.0].
     *
     * @param user participant entity, or {@code null} if not found in cache
     */
    private double participantAvailability(User user) {
        if (user == null) return 0.20;  // degraded but non-zero — entity may just be missing

        double online     = Boolean.TRUE.equals(user.getIsOnline()) ? 0.50 : 0.20;
        double experience = 0.0;
        if (user.getSessionsCompleted() != null) {
            experience = Math.min(0.50, user.getSessionsCompleted() / MAX_SESSIONS);
        }
        return Math.min(1.0, online + experience);
    }

    // ── Utility ───────────────────────────────────────────────────────────────

    /** Load all participant {@link User} entities for a single cycle in one query. */
    @SuppressWarnings("null")
    private Map<String, User> loadParticipants(ExchangeCycle cycle) {
        return userRepository.findAllById(cycle.userIds()).stream()
            .collect(Collectors.toMap(User::getId, u -> u));
    }
}
