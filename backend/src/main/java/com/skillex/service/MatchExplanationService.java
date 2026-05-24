package com.skillex.service;

import com.skillex.dto.match.MatchExplanationDto;
import com.skillex.dto.trust.SkillTrustDto;
import com.skillex.model.Skill;
import com.skillex.model.User;
import com.skillex.repository.ExchangeRepository;
import com.skillex.repository.UserRepository;
import com.skillex.service.match.CompatibilityCalculator;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MatchExplanationService {
    private final UserRepository userRepository;
    private final ExchangeRepository exchangeRepository;
    private final CompatibilityCalculator compatibilityCalculator;
    private final AccountRestrictionService restrictionService;
    private final SkillTrustService skillTrustService;

    @Transactional(readOnly = true)
    public MatchExplanationDto explain(String viewerId, String targetUserId) {
        User viewer = userRepository.findById(viewerId)
            .orElseThrow(() -> new EntityNotFoundException("User not found: " + viewerId));
        User target = userRepository.findById(targetUserId)
            .orElseThrow(() -> new EntityNotFoundException("User not found: " + targetUserId));

        var breakdown = compatibilityCalculator.analyze(viewer, target);
        int semanticFit = pct(breakdown.semanticSimilarity());
        int intentFit = pct(breakdown.intentSimilarity());
        int directSkillFit = directSkillFit(viewer, target);
        int reputationFit = Math.min(100, (int) Math.round(target.getRating().doubleValue() * 20));
        int activityFit = Math.min(100, ((target.getSessionsCompleted() == null ? 0 : target.getSessionsCompleted()) * 8) + (Boolean.TRUE.equals(target.getIsOnline()) ? 20 : 0));
        int safetyFit = restrictionService.safetyScore(targetUserId);
        int fairnessBoost = target.getSessionsCompleted() == null || target.getSessionsCompleted() < 3 ? 8 : 0;
        int declinedPenalty = (int) Math.min(15, exchangeRepository.countByRequesterIdOrReceiverIdAndStatus(
            targetUserId,
            targetUserId,
            com.skillex.model.Exchange.ExchangeStatus.DECLINED
        ) * 3);
        int riskPenalty = Math.max(0, (100 - safetyFit) / 4 + declinedPenalty);
        int finalScore = Math.max(0, Math.min(100, breakdown.finalScore() + fairnessBoost - riskPenalty));
        Skill primarySkill = primaryLearningSkill(viewer, target);
        SkillTrustDto trust = primarySkill == null ? null : skillTrustService.getTrust(targetUserId, primarySkill.getId());
        int skillTrustScore = trust == null ? Math.max(0, Math.min(100, (reputationFit + safetyFit) / 2)) : trust.score();
        int teacherCapabilityScore = Math.max(0, Math.min(100,
            (int) Math.round((skillTrustScore * 0.55) + (reputationFit * 0.25) + (activityFit * 0.20))));
        String recommendedMode = recommendedMode(directSkillFit, teacherCapabilityScore);
        int creditCost = "CREDIT_PAYMENT".equals(recommendedMode) ? (teacherCapabilityScore >= 80 ? 15 : 10) : 0;
        boolean testMeetingRecommended = teacherCapabilityScore < 55 || skillTrustScore < 50 || riskPenalty > 8;
        String whyLearnFromThisUser = whyLearnFromThisUser(target, primarySkill, trust, teacherCapabilityScore);

        List<String> reasons = new ArrayList<>();
        if (directSkillFit > 0) reasons.add("Direct skill exchange fit: " + directSkillFit + "%.");
        if (semanticFit >= 60) reasons.add("Related skills are semantically close: " + semanticFit + "%.");
        if (intentFit >= 50) reasons.add("Learning and teaching intent text aligns: " + intentFit + "%.");
        if (reputationFit >= 80) reasons.add("Strong trust signal from rating and completed sessions.");
        if (fairnessBoost > 0) reasons.add("New-member fairness boost keeps promising learners visible.");
        if (riskPenalty > 0) reasons.add("Risk penalty applied for safety or exchange-history signals.");
        if ("DIRECT_SWAP".equals(recommendedMode)) reasons.add("Recommended path: direct skill swap.");
        if ("CREDIT_PAYMENT".equals(recommendedMode)) reasons.add("Recommended path: spend " + creditCost + " credits because the skill exchange is one-way.");
        if (testMeetingRecommended) reasons.add("A short skill check is recommended before a full session.");
        if (reasons.isEmpty()) reasons.add("This candidate has partial overlap and may still be useful for exploratory learning.");

        return new MatchExplanationDto(
            targetUserId,
            finalScore,
            directSkillFit,
            semanticFit,
            intentFit,
            reputationFit,
            activityFit,
            safetyFit,
            fairnessBoost,
            riskPenalty,
            teacherCapabilityScore,
            skillTrustScore,
            recommendedMode,
            creditCost,
            testMeetingRecommended,
            whyLearnFromThisUser,
            reasons,
            openingMessage(viewer, target)
        );
    }

    private int directSkillFit(User viewer, User target) {
        Set<String> viewerWanted = viewer.getSkillsWanted().stream().map(Skill::getId).collect(Collectors.toSet());
        Set<String> viewerOffered = viewer.getSkillsOffered().stream().map(Skill::getId).collect(Collectors.toSet());
        long teachesViewer = target.getSkillsOffered().stream().filter(s -> viewerWanted.contains(s.getId())).count();
        long wantsFromViewer = target.getSkillsWanted().stream().filter(s -> viewerOffered.contains(s.getId())).count();
        int denominator = Math.max(1, viewerWanted.size() + viewerOffered.size());
        return Math.min(100, (int) Math.round(((teachesViewer + wantsFromViewer) * 100.0) / denominator));
    }

    private Skill primaryLearningSkill(User viewer, User target) {
        Set<String> viewerWanted = viewer.getSkillsWanted().stream().map(Skill::getId).collect(Collectors.toSet());
        return target.getSkillsOffered().stream()
            .filter(skill -> viewerWanted.contains(skill.getId()))
            .findFirst()
            .orElseGet(() -> target.getSkillsOffered().stream().findFirst().orElse(null));
    }

    private String recommendedMode(int directSkillFit, int teacherCapabilityScore) {
        if (directSkillFit > 0) {
            return "DIRECT_SWAP";
        }
        if (teacherCapabilityScore < 45) {
            return "TEST_MEETING";
        }
        return "CREDIT_PAYMENT";
    }

    private String whyLearnFromThisUser(User target, Skill skill, SkillTrustDto trust, int teacherCapabilityScore) {
        String skillName = skill == null ? "this skill" : skill.getName();
        if (trust == null) {
            return target.getName() + " has a capability score of " + teacherCapabilityScore
                + "% for " + skillName + " based on rating, activity, and safety signals.";
        }
        return target.getName() + " has a " + trust.score() + "% skill trust score for " + skillName
            + ", with " + trust.completedTeachingSessions() + " completed teaching sessions, "
            + trust.reviewCount() + " skill reviews, and " + trust.skillCheckSuitableCount()
            + " suitable skill checks.";
    }

    private int pct(double value) {
        return (int) Math.round(Math.max(0, Math.min(1, value)) * 100);
    }

    private String openingMessage(User viewer, User target) {
        String want = viewer.getSkillsWanted().stream().map(Skill::getName).findFirst().orElse("a skill I want to learn");
        String offer = viewer.getSkillsOffered().stream().map(Skill::getName).findFirst().orElse("one of my skills");
        return "Hi " + target.getName().split(" ")[0] + ", I noticed we may be a good SkillEX match. I would like to learn "
            + want + " and can help you with " + offer + ". Would you be open to a short exchange session this week?";
    }
}
