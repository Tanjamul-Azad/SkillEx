package com.skillex.dto.moderation;

import java.time.LocalDateTime;

public record ModerationCaseDto(
    String id,
    String reportId,
    String targetUserId,
    String targetUserName,
    String title,
    String summary,
    String severity,
    String status,
    String aiSummary,
    String aiRecommendedAction,
    LocalDateTime createdAt,
    LocalDateTime updatedAt,
    LocalDateTime closedAt
) {}
