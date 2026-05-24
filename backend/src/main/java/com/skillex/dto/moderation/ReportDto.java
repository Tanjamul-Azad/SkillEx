package com.skillex.dto.moderation;

import java.time.LocalDateTime;

public record ReportDto(
    String id,
    String reporterUserId,
    String reporterName,
    String targetType,
    String targetId,
    String targetUserId,
    String targetUserName,
    String category,
    String reason,
    String evidence,
    String status,
    LocalDateTime createdAt,
    LocalDateTime resolvedAt
) {}
