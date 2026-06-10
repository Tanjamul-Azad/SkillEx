package com.skillex.dto.ai;

import java.time.LocalDateTime;
import java.util.List;

public record LearningPathDto(
    String id,
    String userId,
    String goalSkillId,
    String goalSkillName,
    String targetLevel,
    List<PathStepWithMentor> steps,
    int totalEstimatedHours,
    double progressPercent,
    LocalDateTime createdAt,
    LocalDateTime estimatedCompletionAt,
    String status
) {
    public record PathStepWithMentor(
        int order,
        String skillId,
        String skillName,
        String description,
        int estimatedHours,
        String mentorId,
        String mentorName,
        String mentorAvatar,
        LocalDateTime scheduledSessionAt,
        boolean completed
    ) {}
}
