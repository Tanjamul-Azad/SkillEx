package com.skillex.dto.progress;

import java.time.LocalDateTime;

public record XpEventDto(
    String id,
    String sourceType,
    String sourceId,
    int xpDelta,
    String reason,
    LocalDateTime occurredAt
) {}
