package com.skillex.dto.skill;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request body for POST /api/skills/suggest.
 */
public record SuggestSkillRequest(
    @NotBlank @Size(max = 100) String skillName,
    @Size(max = 50) String category,
    @Size(max = 500) String description,
    @Size(max = 500) String sourceIntent
) {
}
