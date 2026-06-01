package com.skillex.dto.session;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;

/** Request body for POST /api/sessions/connected */
public record CreateConnectedSessionRequest(
    @NotBlank String targetUserId,
    String skillId,
    @NotNull @Future LocalDateTime scheduledAt,
    @Min(15) @Max(240) int durationMins,
    String meetLink,
    String notes,
    String sessionType
) {}
