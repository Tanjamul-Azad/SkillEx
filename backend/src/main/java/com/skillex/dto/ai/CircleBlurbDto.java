package com.skillex.dto.ai;

import jakarta.validation.constraints.NotBlank;

/**
 * Request to generate a compelling circle blurb from circle name and topic.
 */
public record CircleBlurbDto(
    @NotBlank String circleName,
    @NotBlank String topic
) {}
