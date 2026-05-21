package com.skillex.dto.feedback;

import com.skillex.dto.user.UserSummaryDto;

import java.time.LocalDateTime;

/**
 * Response DTO representing feedback details along with user summary.
 */
public record FeedbackDto(
    String id,
    UserSummaryDto user,
    int rating,
    String comment,
    LocalDateTime createdAt
) {}
