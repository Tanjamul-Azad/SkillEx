package com.skillex.dto.trust;

import java.util.List;

public record SkillTrustDto(
    String userId,
    String skillId,
    String skillName,
    int score,
    int proofScore,
    int sessionScore,
    int reviewScore,
    int skillCheckScore,
    int safetyScore,
    boolean adminVerified,
    boolean proofUploaded,
    long completedTeachingSessions,
    long reviewCount,
    double averageSkillRating,
    long skillCheckSuitableCount,
    List<String> reasons
) {}
