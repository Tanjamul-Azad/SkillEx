package com.skillex.dto.moderation;

import java.time.LocalDateTime;

public record UserRestrictionDto(
    String id,
    String userId,
    String restrictionType,
    String reason,
    String status,
    LocalDateTime startsAt,
    LocalDateTime endsAt,
    LocalDateTime createdAt
) {}
