package com.skillex.dto.user;

import java.time.LocalDateTime;
import java.util.List;

public record ResumeProfileDto(
    String id,
    String userId,
    String resumeUrl,
    String sourceFilename,
    String contentType,
    String extractionMethod,
    String status,
    String headline,
    String educationSummary,
    String experienceSummary,
    String projectSummary,
    String certificationSummary,
    String toolsSummary,
    String languageSummary,
    String careerGoal,
    String teachSummary,
    String learnSummary,
    List<SkillSuggestion> suggestedOfferedSkills,
    List<SkillSuggestion> suggestedWantedSkills,
    List<ProfileSignal> profileSignals,
    int confidence,
    String rawTextPreview,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {
    public record SkillSuggestion(
        String name,
        String category,
        String level,
        String evidence,
        int confidence
    ) {}

    public record ProfileSignal(
        String label,
        String value
    ) {}
}
