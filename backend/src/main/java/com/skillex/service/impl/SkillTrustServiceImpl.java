package com.skillex.service.impl;

import com.skillex.dto.trust.SkillTrustDto;
import com.skillex.model.Session;
import com.skillex.model.Skill;
import com.skillex.model.SkillCheckFeedback;
import com.skillex.model.SkillTrustScore;
import com.skillex.model.User;
import com.skillex.model.UserSkillOffered;
import com.skillex.repository.ReviewRepository;
import com.skillex.repository.SessionRepository;
import com.skillex.repository.SkillCheckFeedbackRepository;
import com.skillex.repository.SkillRepository;
import com.skillex.repository.SkillTrustScoreRepository;
import com.skillex.repository.UserRepository;
import com.skillex.repository.UserSkillOfferedRepository;
import com.skillex.service.AccountRestrictionService;
import com.skillex.service.SkillTrustService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SkillTrustServiceImpl implements SkillTrustService {
    private final UserRepository userRepository;
    private final SkillRepository skillRepository;
    private final UserSkillOfferedRepository offeredRepository;
    private final SessionRepository sessionRepository;
    private final ReviewRepository reviewRepository;
    private final SkillCheckFeedbackRepository skillCheckFeedbackRepository;
    private final SkillTrustScoreRepository trustScoreRepository;
    private final AccountRestrictionService restrictionService;

    @Override
    @Transactional
    public SkillTrustDto getTrust(String userId, String skillId) {
        User user = userRepository.findById(userId).orElseThrow(() -> new EntityNotFoundException("User not found: " + userId));
        Skill skill = skillRepository.findById(skillId).orElseThrow(() -> new EntityNotFoundException("Skill not found: " + skillId));
        UserSkillOffered offered = offeredRepository.findById(new UserSkillOffered.UserSkillId(userId, skillId)).orElse(null);
        boolean proofUploaded = offered != null && offered.getProofVideoUrl() != null && !offered.getProofVideoUrl().isBlank();
        long completedSessions = sessionRepository.countByTeacherIdAndSkillIdAndStatus(userId, skillId, Session.SessionStatus.COMPLETED);
        long reviewCount = reviewRepository.countByToUserIdAndSkillId(userId, skillId);
        double averageRating = reviewRepository.findAverageRatingByToUserIdAndSkillId(userId, skillId) == null
            ? 0.0
            : reviewRepository.findAverageRatingByToUserIdAndSkillId(userId, skillId);
        long suitableChecks = skillCheckFeedbackRepository.countByTargetUserIdAndMeetingSkillIdAndOutcome(
            userId,
            skillId,
            SkillCheckFeedback.SkillCheckOutcome.SUITABLE
        );
        long totalChecks = skillCheckFeedbackRepository.countByTargetUserIdAndMeetingSkillId(userId, skillId);

        int proofScore = proofUploaded ? 20 : 0;
        int sessionScore = (int) Math.min(25, completedSessions * 5);
        int reviewScore = reviewCount == 0 ? 0 : (int) Math.min(25, Math.round(averageRating * 5));
        int skillCheckScore = totalChecks == 0 ? 0 : (int) Math.min(15, suitableChecks * 5 + Math.max(0, totalChecks - suitableChecks) * 2);
        int safetyScore = restrictionService.safetyScore(userId);
        boolean adminVerified = trustScoreRepository.findByUserIdAndSkillId(userId, skillId)
            .map(s -> Boolean.TRUE.equals(s.getAdminVerified()))
            .orElse(false);
        int verifiedScore = adminVerified ? 15 : 0;
        int score = Math.max(0, Math.min(100, proofScore + sessionScore + reviewScore + skillCheckScore + verifiedScore - ((100 - safetyScore) / 3)));

        List<String> reasons = new ArrayList<>();
        if (proofUploaded) reasons.add("Uploaded proof video for this skill.");
        if (completedSessions > 0) reasons.add("Completed " + completedSessions + " teaching session(s) for this skill.");
        if (reviewCount > 0) reasons.add("Average skill rating is " + String.format("%.1f", averageRating) + " from " + reviewCount + " review(s).");
        if (suitableChecks > 0) reasons.add(suitableChecks + " skill check outcome(s) marked suitable.");
        if (adminVerified) reasons.add("Admin verified this skill.");
        if (safetyScore < 100) reasons.add("Safety restrictions reduce the trust score.");
        if (reasons.isEmpty()) reasons.add("Trust score is new and will improve with proof, sessions, reviews, and skill checks.");

        SkillTrustScore row = trustScoreRepository.findByUserIdAndSkillId(userId, skillId).orElseGet(SkillTrustScore::new);
        row.setUser(user);
        row.setSkill(skill);
        row.setScore(score);
        row.setProofScore(proofScore);
        row.setSessionScore(sessionScore);
        row.setReviewScore(reviewScore);
        row.setSkillCheckScore(skillCheckScore);
        row.setSafetyScore(safetyScore);
        row.setAdminVerified(adminVerified);
        row.setComputedAt(LocalDateTime.now());
        trustScoreRepository.save(row);

        return new SkillTrustDto(
            userId,
            skillId,
            skill.getName(),
            score,
            proofScore,
            sessionScore,
            reviewScore,
            skillCheckScore,
            safetyScore,
            adminVerified,
            proofUploaded,
            completedSessions,
            reviewCount,
            averageRating,
            suitableChecks,
            reasons
        );
    }
}
