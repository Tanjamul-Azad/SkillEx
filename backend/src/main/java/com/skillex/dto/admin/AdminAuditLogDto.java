package com.skillex.dto.admin;

import java.time.LocalDateTime;

public record AdminAuditLogDto(
    String id,
    String adminUserId,
    String adminName,
    String action,
    String entityType,
    String entityId,
    String details,
    LocalDateTime createdAt
) {}
