package com.skillex.dto.admin;

import java.time.LocalDateTime;

public record PlatformRuleDto(
    String id,
    String code,
    String title,
    String description,
    String category,
    String severity,
    String defaultAction,
    boolean active,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {}
