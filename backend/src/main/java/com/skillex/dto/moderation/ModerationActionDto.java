package com.skillex.dto.moderation;

import java.time.LocalDateTime;

public record ModerationActionDto(
    String id,
    String caseId,
    String adminUserId,
    String adminName,
    String targetUserId,
    String targetUserName,
    String targetType,
    String targetId,
    String actionType,
    String severity,
    String reason,
    String evidence,
    Integer durationHours,
    LocalDateTime createdAt
) {}
