package com.skillex.dto.skillcheck;

import com.skillex.dto.user.UserSummaryDto;

import java.time.LocalDateTime;

public record SkillCheckMeetingDto(
    String id,
    UserSummaryDto requester,
    UserSummaryDto targetUser,
    SkillRef skill,
    String status,
    String requesterOutcome,
    String targetOutcome,
    boolean checklistIntro,
    boolean checklistDemo,
    boolean checklistGoalAlignment,
    boolean checklistScheduleFit,
    String message,
    LocalDateTime scheduledAt,
    LocalDateTime createdAt
) {
    public record SkillRef(String id, String name, String icon, String category) {}
}
