package com.skillex.dto.ai;

import jakarta.validation.constraints.NotBlank;

/**
 * Request to generate a polished skill description from skill name and level.
 */
public record SkillDescriptionDto(
    @NotBlank String skillName,
    @NotBlank String level
) {}
