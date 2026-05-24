package com.skillex.dto.match;

import java.util.List;

public record MatchExplanationDto(
    String targetUserId,
    int finalScore,
    int directSkillFit,
    int semanticFit,
    int intentFit,
    int reputationFit,
    int activityFit,
    int safetyFit,
    int fairnessBoost,
    int riskPenalty,
    int teacherCapabilityScore,
    int skillTrustScore,
    String recommendedMode,
    int creditCost,
    boolean testMeetingRecommended,
    String whyLearnFromThisUser,
    List<String> reasons,
    String suggestedOpeningMessage
) {}
