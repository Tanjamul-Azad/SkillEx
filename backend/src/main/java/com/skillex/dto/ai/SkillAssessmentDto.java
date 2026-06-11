package com.skillex.dto.ai;

import java.time.LocalDateTime;
import java.util.List;

public record SkillAssessmentDto(
    String assessmentId,
    String skillId,
    String skillName,
    String difficulty,
    List<QuizQuestion> questions,
    long timeAllowedMinutes
) {
    public record QuizQuestion(
        String questionId,
        String question,
        String type, // "multiple_choice", "free_text", "fill_blank"
        List<String> options, // null for free-text/fill-blank
        String correctAnswer // used only after grading
    ) {}

    public record GradedAssessment(
        String assessmentId,
        String skillId,
        String skillName,
        int score, // 0-100
        int questionsCorrect,
        int questionsTotal,
        String proficiencyLevel, // "novice", "intermediate", "proficient", "expert"
        String feedback,
        LocalDateTime completedAt,
        boolean passedThreshold // >= 70%
    ) {}
}
