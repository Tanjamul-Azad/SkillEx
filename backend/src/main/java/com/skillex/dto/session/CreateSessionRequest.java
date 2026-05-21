package com.skillex.dto.session;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;

/** Request body for POST /api/sessions */
public record CreateSessionRequest(
    @NotBlank String exchangeId,
    String teacherId,
    String learnerId,
    String skillId,
    @NotNull @Future LocalDateTime scheduledAt,
    @Min(15) @Max(240) int durationMins,
    String meetLink,      // optional
    String sessionType    // optional — "VIDEO" (default) or "AUDIO"
) {}
