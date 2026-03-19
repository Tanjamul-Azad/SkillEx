package com.skillex.service.match;

import com.skillex.dto.user.MatchUserDto;
import com.skillex.model.Skill;
import com.skillex.model.User;
import com.skillex.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Basic implementation of {@link MatchStrategy}.
 *
 * Uses the original SkiilEX compatibility formula (max 100):
 * <pre>
 *   score = (overlapCount × 20) + (rating × 10) + min(skillexScore / 10, 20)
 * </pre>
 *
 * Candidates are sourced from users whose offered skills intersect with the
 * current user's full skill set (offered ∪ wanted).
 *
 * OOP notes:
 *  - Single Responsibility: only contains the basic scoring algorithm
 *  - Open/Closed: {@code computeScore()} is protected so subclasses can override
 *    without duplicating the DTO-building logic
 */
@Component
@RequiredArgsConstructor
public class BasicMatchStrategy implements MatchStrategy {

    private final UserRepository userRepository;

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

        Set<String> allMySkillIds = new HashSet<>(myOfferedIds);
        allMySkillIds.addAll(myWantedIds);

        List<String> candidateIds = userRepository.findMatchCandidates(
            uid, allMySkillIds, PageRequest.of(0, limit * 3));

        return candidateIds.stream()
            .map(id -> userRepository.findById(id).orElse(null))
            .filter(Objects::nonNull)
            .map(candidate -> buildMatchDto(candidate, myOfferedIds, myWantedIds))
            .sorted(Comparator.comparingInt(MatchUserDto::compatibilityScore).reversed())
            .limit(limit)
            .collect(Collectors.toList());
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    /** Builds the result DTO from a candidate relative to the current user's skill sets. */
    protected MatchUserDto buildMatchDto(User candidate, Set<String> myOfferedIds, Set<String> myWantedIds) {
        List<String> teachesYou = candidate.getSkillsOffered().stream()
            .filter(s -> myWantedIds.contains(s.getId()))
            .map(Skill::getName)
            .collect(Collectors.toList());

        List<String> wantsToLearnFromYou = candidate.getSkillsWanted().stream()
            .filter(s -> myOfferedIds.contains(s.getId()))
            .map(Skill::getName)
            .collect(Collectors.toList());

        int overlapCount = teachesYou.size() + wantsToLearnFromYou.size();
        int score = computeScore(candidate, overlapCount);

        return new MatchUserDto(
            candidate.getId(),
            candidate.getName(),
            candidate.getAvatar(),
            candidate.getUniversity(),
            candidate.getLevel() != null ? candidate.getLevel().name() : null,
            candidate.getSkillexScore()  != null ? candidate.getSkillexScore()  : 0,
            candidate.getRating()        != null ? candidate.getRating()        : BigDecimal.ZERO,
            candidate.getIsOnline()      != null ? candidate.getIsOnline()      : false,
            candidate.getSessionsCompleted() != null ? candidate.getSessionsCompleted() : 0,
            score,
            overlapCount > 0 ? 100 : 0,
            "basic",
            teachesYou,
            wantsToLearnFromYou,
            buildMatchReasons(teachesYou, wantsToLearnFromYou)
        );
    }

    private List<String> buildMatchReasons(List<String> teachesYou, List<String> wantsToLearnFromYou) {
        List<String> reasons = new ArrayList<>();
        if (!teachesYou.isEmpty()) {
            reasons.add("They teach " + teachesYou.get(0) + ", which matches one of your learning goals.");
        }
        if (!wantsToLearnFromYou.isEmpty()) {
            reasons.add("They want to learn " + wantsToLearnFromYou.get(0) + ", which you can teach.");
        }
        if (reasons.isEmpty()) {
            reasons.add("Basic overlap strategy found this candidate from your current skill graph.");
        }
        return reasons;
    }

    /**
     * Core scoring formula — override in subclasses to change the algorithm.
     *
     * @param candidate    the candidate user
     * @param overlapCount total matched skills (teachesYou + wantsToLearnFromYou)
     * @return  compatibility score capped at 100
     */
    protected int computeScore(User candidate, int overlapCount) {
        double overlapPart = overlapCount * 20.0;
        double ratingPart  = candidate.getRating()      != null ? candidate.getRating().doubleValue() * 10 : 0;
        double scorePart   = candidate.getSkillexScore() != null ? Math.min(candidate.getSkillexScore() / 10.0, 20) : 0;
        return (int) Math.min(100, overlapPart + ratingPart + scorePart);
    }

    protected static Set<String> skillIds(List<Skill> skills) {
        return skills.stream().map(Skill::getId).collect(Collectors.toSet());
    }
}
