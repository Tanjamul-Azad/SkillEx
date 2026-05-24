package com.skillex.dto.skillcheck;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

public record CreateSkillCheckRequest(
    @NotBlank String targetUserId,
    @NotBlank String skillId,
    @Size(max = 1000) String message,
    LocalDateTime scheduledAt
) {}
