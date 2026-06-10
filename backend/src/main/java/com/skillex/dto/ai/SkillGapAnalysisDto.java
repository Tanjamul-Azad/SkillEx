package com.skillex.dto.ai;

import java.util.List;

public record SkillGapAnalysisDto(
    String goalSkillId,
    String goalSkillName,
    List<String> currentSkills,
    List<SkillGapDto> gaps,
    LearningPath recommendedPath,
    String summary
) {
    public record LearningPath(
        List<PathStep> steps,
        int estimatedHours,
        String reasoning
    ) {}

    public record PathStep(
        int order,
        String skillName,
        String skillId,
        String rationale,
        int estimatedHours,
        List<MentorMatch> availableMentors
    ) {}

    public record MentorMatch(
        String mentorId,
        String mentorName,
        String mentorAvatar,
        double trustScore,
        int sessionsCompleted,
        double avgRating,
        String matchReason
    ) {}
}
