package com.skillex.dto.review;

import com.skillex.dto.user.UserSummaryDto;

import java.time.LocalDateTime;

/** Response DTO for a review */
public record ReviewDto(
    String id,
    String sessionId,
    UserSummaryDto fromUser,
    UserSummaryDto toUser,
    SkillRef skill,
    int rating,
    String comment,
    LocalDateTime createdAt
) {
    public record SkillRef(String id, String name, String icon) {}
}
