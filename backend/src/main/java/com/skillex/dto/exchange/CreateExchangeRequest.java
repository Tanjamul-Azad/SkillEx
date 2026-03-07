package com.skillex.dto.exchange;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Request body for POST /api/exchanges */
public record CreateExchangeRequest(
    @NotBlank String receiverId,
    String offeredSkillId,           // optional — can be null
    String wantedSkillId,            // optional — can be null
    @Size(max = 1000) String message
) {}
