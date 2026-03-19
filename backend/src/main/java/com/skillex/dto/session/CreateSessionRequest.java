package com.skillex.dto.session;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;

/** Request body for POST /api/sessions */
public record CreateSessionRequest(
    @NotBlank String exchangeId,
    @NotBlank String teacherId,
    @NotBlank String learnerId,
    @NotBlank String skillId,
    @NotNull @Future LocalDateTime scheduledAt,
    @Min(15) int durationMins,
    String meetLink   // optional
) {}
