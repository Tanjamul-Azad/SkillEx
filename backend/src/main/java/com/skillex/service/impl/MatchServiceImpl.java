package com.skillex.service.impl;

import com.skillex.dto.user.MatchUserDto;
import com.skillex.model.Skill;
import com.skillex.model.User;
import com.skillex.repository.UserRepository;
import com.skillex.service.MatchService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Computes bidirectional skill compatibility between the current user and all candidates.
 *
 * Score = (overlapCount × 20) + (rating × 10) + min(skillexScore / 10, 20)  [capped at 100]
 *
 * OOP notes:
 *  - Single Responsibility: only matching logic lives here
 *  - Open/Closed: scoring formula is isolated in computeScore(), easy to extend
 */
@Service
@RequiredArgsConstructor
public class MatchServiceImpl implements MatchService {

    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public List<MatchUserDto> findMatches(String userId, int limit) {
        User currentUser = userRepository.findById(userId)
            .orElseThrow(() -> new EntityNotFoundException("User not found: " + userId));

        Set<String> myOfferedIds = currentUser.getSkillsOffered().stream()
            .map(Skill::getId).collect(Collectors.toSet());
        Set<String> myWantedIds = currentUser.getSkillsWanted().stream()
            .map(Skill::getId).collect(Collectors.toSet());

        if (myOfferedIds.isEmpty() && myWantedIds.isEmpty()) {
            return Collections.emptyList();
        }

        // Merge offered + wanted to find any overlap candidates
        Set<String> allMySkillIds = new HashSet<>(myOfferedIds);
        allMySkillIds.addAll(myWantedIds);

        List<String> candidateIds = userRepository.findMatchCandidates(userId, allMySkillIds,
            PageRequest.of(0, limit * 3)); 

        return candidateIds.stream()
            .map(id -> userRepository.findById(id).orElse(null))
            .filter(Objects::nonNull)
            .map(candidate -> buildMatchDto(candidate, myOfferedIds, myWantedIds))
            .sorted(Comparator.comparingInt(MatchUserDto::compatibilityScore).reversed())
            .limit(limit)
            .collect(Collectors.toList());
    }

    // ── Private helpers ──────────────────────────────────────────────────────

    /**
     * Build a MatchUserDto for one candidate relative to the current user.
     *
     * teachesYou  = skills candidate offers that I want
     * wantsToLearnFromYou = skills candidate wants that I offer
     */
    private MatchUserDto buildMatchDto(User candidate, Set<String> myOfferedIds, Set<String> myWantedIds) {
        Set<String> theirOfferedIds = candidate.getSkillsOffered().stream()
            .map(Skill::getId).collect(Collectors.toSet());
        Set<String> theirWantedIds  = candidate.getSkillsWanted().stream()
            .map(Skill::getId).collect(Collectors.toSet());

        // Skills they teach that I want to learn
        List<String> teachesYou = candidate.getSkillsOffered().stream()
            .filter(s -> myWantedIds.contains(s.getId()))
            .map(Skill::getName)
            .collect(Collectors.toList());

        // Skills they want to learn that I can teach
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
            candidate.getSkillexScore() != null ? candidate.getSkillexScore() : 0,
            candidate.getRating() != null ? candidate.getRating() : java.math.BigDecimal.ZERO,
            candidate.getIsOnline() != null ? candidate.getIsOnline() : false,
            score,
            teachesYou,
            wantsToLearnFromYou
        );
    }

    private int computeScore(User candidate, int overlapCount) {
        double ratingPart   = candidate.getRating() != null ? candidate.getRating().doubleValue() * 10 : 0;
        double scorePart    = candidate.getSkillexScore() != null ? Math.min(candidate.getSkillexScore() / 10.0, 20) : 0;
        double overlapPart  = overlapCount * 20;
        return (int) Math.min(100, overlapPart + ratingPart + scorePart);
    }
}
