package com.skillex.dto.exchange;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/** Request body for PATCH /api/exchanges/{id} — only status changes are allowed */
public record UpdateExchangeRequest(
    @NotBlank @Pattern(regexp = "ACCEPTED|DECLINED|COMPLETED|CANCELLED") String status
) {}
