package com.skillex.dto.credits;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record AdjustCreditsRequest(
    @NotBlank String userId,
    @NotNull Integer amount,
    @NotBlank String reason
) {}
