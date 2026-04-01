package com.skillex.dto.connection;

import com.skillex.dto.user.UserSummaryDto;

import java.time.LocalDateTime;

/** Response DTO for a user connection request/relationship. */
public record ConnectionDto(
    String id,
    UserSummaryDto requester,
    UserSummaryDto receiver,
    String message,
    String status,
    LocalDateTime respondedAt,
    LocalDateTime createdAt
) {}
