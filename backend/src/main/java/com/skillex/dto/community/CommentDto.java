package com.skillex.dto.community;

import com.skillex.dto.user.UserSummaryDto;

import java.time.LocalDateTime;

/** Response DTO for a single comment on a post */
public record CommentDto(
    String id,
    UserSummaryDto author,
    String content,
    LocalDateTime createdAt
) {}
