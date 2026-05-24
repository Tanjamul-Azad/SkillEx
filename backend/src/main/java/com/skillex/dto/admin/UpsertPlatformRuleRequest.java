package com.skillex.dto.admin;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record UpsertPlatformRuleRequest(
    @NotBlank String code,
    @NotBlank String title,
    String description,
    @NotBlank String category,
    @Pattern(regexp = "LOW|MEDIUM|HIGH|CRITICAL") String severity,
    @Pattern(regexp = "WARN|HIDE_CONTENT|REMOVE_CONTENT|RESTRICT_POSTING|RESTRICT_MESSAGING|SUSPEND_ACCOUNT|BAN_ACCOUNT|NO_ACTION") String defaultAction,
    Boolean active
) {}
