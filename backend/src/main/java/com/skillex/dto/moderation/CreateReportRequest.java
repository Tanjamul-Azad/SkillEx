package com.skillex.dto.moderation;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record CreateReportRequest(
    @NotBlank @Pattern(regexp = "USER|POST|COMMENT|MESSAGE|PROFILE|SESSION|REVIEW|SKILL|DISCUSSION") String targetType,
    @NotBlank String targetId,
    String targetUserId,
    @NotBlank String category,
    @NotBlank String reason,
    String evidence
) {}
