package com.skillex.dto.session;

import com.skillex.dto.user.UserSummaryDto;

import java.time.LocalDateTime;

/** Response DTO for a session */
public record SessionDto(
    String id,
    String exchangeId,
    UserSummaryDto teacher,
    UserSummaryDto learner,
    SkillRef skill,
    LocalDateTime scheduledAt,
    int durationMins,
    String status,
    String meetLink,
    LocalDateTime createdAt
) {
    public record SkillRef(String id, String name, String icon, String category) {}
}
