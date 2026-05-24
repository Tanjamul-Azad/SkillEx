package com.skillex.dto.moderation;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record CreateModerationActionRequest(
    String caseId,
    String targetUserId,
    String targetType,
    String targetId,
    @NotBlank @Pattern(regexp = "WARN|HIDE_CONTENT|REMOVE_CONTENT|RESTRICT_POSTING|RESTRICT_MESSAGING|SUSPEND_ACCOUNT|BAN_ACCOUNT|NO_ACTION") String actionType,
    @Pattern(regexp = "LOW|MEDIUM|HIGH|CRITICAL") String severity,
    @NotBlank String reason,
    String evidence,
    Integer durationHours
) {}
