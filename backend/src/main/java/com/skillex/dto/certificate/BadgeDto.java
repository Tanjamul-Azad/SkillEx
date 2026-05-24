package com.skillex.dto.certificate;

import java.time.LocalDateTime;

public record BadgeDto(
    String id,
    String code,
    String name,
    String description,
    String icon,
    String category,
    String skillId,
    String skillName,
    String status,
    LocalDateTime awardedAt
) {}
