package com.skillex.dto.exchange;

import com.skillex.dto.user.UserSummaryDto;

import java.time.LocalDateTime;

/** Response DTO for an exchange — safe to expose, no raw entities */
public record ExchangeDto(
    String id,
    UserSummaryDto requester,
    UserSummaryDto receiver,
    SkillRef offeredSkill,
    SkillRef wantedSkill,
    String message,
    String status,
    LocalDateTime sessionDate,
    LocalDateTime createdAt
) {
    public record SkillRef(String id, String name, String icon, String category) {}
}
