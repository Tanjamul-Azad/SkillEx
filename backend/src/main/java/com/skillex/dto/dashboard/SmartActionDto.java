package com.skillex.dto.dashboard;

public record SmartActionDto(
    String id,
    String type,
    String title,
    String reason,
    int priority,
    String actionLabel,
    String route,
    String relatedEntityId
) {}
