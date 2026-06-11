package com.skillex.dto.ai;

import jakarta.validation.constraints.NotBlank;

/**
 * Request to generate a professional bio from a user's one-sentence self-description.
 */
public record GeneratedBioDto(
    @NotBlank String topic
) {}
