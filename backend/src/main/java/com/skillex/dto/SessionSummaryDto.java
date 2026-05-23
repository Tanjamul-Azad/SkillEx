package com.skillex.dto;

import java.time.LocalDateTime;

public record SessionSummaryDto(
    String id,
    String status,
    LocalDateTime endedAt
) {}
