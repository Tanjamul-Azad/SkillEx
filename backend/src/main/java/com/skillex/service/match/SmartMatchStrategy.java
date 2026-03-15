package com.skillex.service.match;

import com.skillex.dto.user.MatchUserDto;
import com.skillex.model.Skill;
import com.skillex.model.User;
import com.skillex.repository.UserRepository;
import com.skillex.service.SkillSimilarityService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Enhanced implementation of {@link MatchStrategy}.
 *
 * Improvements over {@link BasicMatchStrategy}:
 * <ol>
 *   <li><b>Semantic candidate expansion</b> — before querying candidates, both the
 *       current user's offered and wanted skill sets are expanded with semantically
 *       similar skills (score ≥ 0.60) from the {@code skill_relations} graph, so
 *       a user who knows Python is also matched against Data Science learners.</li>
 *   <li><b>Expanded candidate pool</b> — fetches two sets of candidates:
 *       (a) users who <i>offer</i> skills the current user wants to learn (or a
 *           semantically similar skill), and
 *       (b) users who <i>want</i> skills the current user can teach (or similar).</li>
 *   <li><b>Directional scoring</b> — teaches-you and wants-to-learn-from-you
 *       slots are scored individually (capped at 30 each) rather than a flat
 *       overlap count, rewarding targeted mutual matches.</li>
 *   <li><b>Mutual exchange bonus</b> — +10 pts when <i>both</i> directions are
 *       non-empty, incentivising true reciprocal skill swaps.</li>
 *   <li><b>Richer reputation signal</b> — rating mapped to a 20-pt window
 *       ({@code (rating / 5.0) × 20}), so a 4.5-star user scores materially
 *       higher than a 3.0-star user.</li>
 *   <li><b>Activity signals</b> — online presence (+5) and sessions completed
 *       (up to +5) reward active, experienced members.</li>
 * </ol>
 *
 * Score breakdown (ceiling 100):
 * <pre>
 *   teachesYou       = min(teachesYou.size()        × 15, 30)
 *   wantsFromYou     = min(wantsToLearnFromYou.size() × 15, 30)
 *   mutualBonus      = (both non-empty) ? 10 : 0
 *   reputation       = (rating / 5.0) × 20                        → max 20
 *   onlineBonus      = isOnline ? 5 : 0                            → max  5
 *   sessionsBonus    = min(sessionsCompleted / 5, 5)               → max  5
 *   ─────────────────────────────────────────────────────────────────────────
 *   total            = min(100, sum of above)
 * </pre>
 *
 * OOP notes:
 *  - Open/Closed: new signals can be added by changing only this class
 *  - Dependency Inversion: depends on UserRepository abstraction, not impl
 */
@Component
@RequiredArgsConstructor
public class SmartMatchStrategy implements MatchStrategy {

    /** Minimum similarity score to treat another skill as "related enough" for candidate expansion. */
    private static final double SIMILARITY_THRESHOLD = 0.60;

    private final UserRepository         userRepository;
    private final SkillSimilarityService  skillSimilarityService;
    private final CompatibilityCalculator compatibilityCalculator;

    private record SkillPairReason(String message, double similarity) {}

    @Override
    @Transactional(readOnly = true)
    @SuppressWarnings("null")
    public List<MatchUserDto> findMatches(UUID userId, int limit) {
        String uid = userId.toString();

        User current = userRepository.findById(uid)
            .orElseThrow(() -> new EntityNotFoundException("User not found: " + uid));

        Set<String> myOfferedIds = skillIds(current.getSkillsOffered());
        Set<String> myWantedIds  = skillIds(current.getSkillsWanted());

        if (myOfferedIds.isEmpty() && myWantedIds.isEmpty()) {
            return Collections.emptyList();
        }

        // ── Semantic expansion ────────────────────────────────────────────────
        // Expand each skill set with related skills from the similarity graph so
        // we surface candidates who know "nearby" skills, not only exact matches.
        // e.g. a Python user will also match against Data Science learners.
        Set<String> expandedWanted  = skillSimilarityService.expandWithSimilar(myWantedIds,  SIMILARITY_THRESHOLD);
        Set<String> expandedOffered = skillSimilarityService.expandWithSimilar(myOfferedIds, SIMILARITY_THRESHOLD);

        // Fetch a wide candidate pool using both directions:
        //   (a) people who offer something I want to learn (or something similar)
        //   (b) people who want something I can teach (or something similar)
        Set<String> candidateIds = new LinkedHashSet<>();
        int poolSize = limit * 4;

        if (!expandedWanted.isEmpty()) {
            candidateIds.addAll(userRepository.findMatchCandidates(
                uid, expandedWanted, PageRequest.of(0, poolSize)));
        }
        if (!expandedOffered.isEmpty()) {
            candidateIds.addAll(userRepository.findCandidatesByWantedSkills(
                uid, expandedOffered, PageRequest.of(0, poolSize)));
        }

        return candidateIds.stream()
            .map(id -> userRepository.findById(id).orElse(null))
            .filter(Objects::nonNull)
            .map(candidate -> buildMatchDto(current, candidate, myOfferedIds, myWantedIds))
            .sorted(Comparator.comparingInt(MatchUserDto::compatibilityScore).reversed())
            .limit(limit)
            .collect(Collectors.toList());
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    /**
     * Build the result DTO.
     *
     * <p>The {@code teachesYou} / {@code wantsToLearnFromYou} lists shown to the
     * user are derived from <b>exact</b> skill name matches only (clean UX).
     * The compatibility score is delegated entirely to {@link CompatibilityCalculator},
     * which handles skill similarity, rating, sessions, activity, and exchange balance.
     */
    private MatchUserDto buildMatchDto(User viewer,
                                       User candidate,
                                       Set<String> myOfferedIds,
                                       Set<String> myWantedIds) {
        CompatibilityCalculator.CompatibilityBreakdown breakdown =
            compatibilityCalculator.analyze(viewer, candidate);

        List<String> teachesYou = candidate.getSkillsOffered().stream()
            .filter(s -> myWantedIds.contains(s.getId()))
            .map(Skill::getName)
            .collect(Collectors.toList());

        List<String> wantsToLearnFromYou = candidate.getSkillsWanted().stream()
            .filter(s -> myOfferedIds.contains(s.getId()))
            .map(Skill::getName)
            .collect(Collectors.toList());

        int score = breakdown.finalScore();
        int semanticSimilarity = (int) Math.round(breakdown.semanticSimilarity() * 100);
        List<String> reasons = buildMatchReasons(viewer, candidate, teachesYou, wantsToLearnFromYou, breakdown);

        return new MatchUserDto(
            candidate.getId(),
            candidate.getName(),
            candidate.getAvatar(),
            candidate.getUniversity(),
            candidate.getLevel()        != null ? candidate.getLevel().name() : null,
            candidate.getSkillexScore() != null ? candidate.getSkillexScore() : 0,
            candidate.getRating()       != null ? candidate.getRating()       : BigDecimal.ZERO,
            candidate.getIsOnline()     != null ? candidate.getIsOnline()     : false,
            candidate.getSessionsCompleted() != null ? candidate.getSessionsCompleted() : 0,
            score,
            semanticSimilarity,
            "smart-ai",
            teachesYou,
            wantsToLearnFromYou,
            reasons
        );
    }

    private List<String> buildMatchReasons(User viewer,
                                           User candidate,
                                           List<String> teachesYou,
                                           List<String> wantsToLearnFromYou,
                                           CompatibilityCalculator.CompatibilityBreakdown breakdown) {
        List<String> reasons = new ArrayList<>();

        if (!teachesYou.isEmpty() && !wantsToLearnFromYou.isEmpty()) {
            reasons.add("Strong two-way exchange: both of you can help each other directly.");
        }

        if (!teachesYou.isEmpty()) {
            reasons.add("They can teach you " + teachesYou.get(0) + ".");
        }
        if (!wantsToLearnFromYou.isEmpty()) {
            reasons.add("They want to learn " + wantsToLearnFromYou.get(0) + " from you.");
        }

        findTopSemanticReason(viewer.getSkillsWanted(), candidate.getSkillsOffered(), true)
            .ifPresent(reason -> reasons.add(reason.message()));
        findTopSemanticReason(candidate.getSkillsWanted(), viewer.getSkillsOffered(), false)
            .ifPresent(reason -> reasons.add(reason.message()));

        if (breakdown.semanticSimilarity() >= 0.80) {
            reasons.add("High semantic skill similarity: " + (int) Math.round(breakdown.semanticSimilarity() * 100) + "%.");
        }

        return reasons.stream().distinct().limit(4).collect(Collectors.toList());
    }

    private Optional<SkillPairReason> findTopSemanticReason(List<Skill> seekerSkills,
                                                            List<Skill> providerSkills,
                                                            boolean candidateTeachesViewer) {
        Skill seekerBest = null;
        Skill providerBest = null;
        double best = 0.0;

        for (Skill seeker : seekerSkills) {
            for (Skill provider : providerSkills) {
                double similarity = skillSimilarityService.computeSimilarity(seeker.getId(), provider.getId());
                if (similarity > best) {
                    best = similarity;
                    seekerBest = seeker;
                    providerBest = provider;
                }
            }
        }

        if (seekerBest == null || providerBest == null || best < SIMILARITY_THRESHOLD || seekerBest.getId().equals(providerBest.getId())) {
            return Optional.empty();
        }

        int percent = (int) Math.round(best * 100);
        String message = candidateTeachesViewer
            ? providerBest.getName() + " aligns with your interest in " + seekerBest.getName() + " (" + percent + "% similarity)."
            : "Your " + providerBest.getName() + " aligns with their interest in " + seekerBest.getName() + " (" + percent + "% similarity).";

        return Optional.of(new SkillPairReason(message, best));
    }

    private static Set<String> skillIds(List<Skill> skills) {
        return skills.stream().map(Skill::getId).collect(Collectors.toSet());
    }
}
