package com.skillex.dto.ai;

import java.util.List;

public record SkillGapDto(
    String skillId,
    String skillName,
    String category,
    double similarityToGoal,
    String whyMissing,
    List<String> availableMentorNames,
    int mentorCount
) {}
