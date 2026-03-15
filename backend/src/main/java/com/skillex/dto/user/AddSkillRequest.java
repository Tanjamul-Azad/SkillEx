package com.skillex.dto.user;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Request body for POST /api/users/me/skills.
 * Provide either {@code skillId} (existing catalog skill) OR
 * {@code skillName} (custom skill — created on-the-fly if it doesn't exist).
 */
public record AddSkillRequest(
    String skillId,

    @Size(max = 100) String skillName,
    @Size(max = 50)  String skillCategory,
    @Size(max = 500) String skillDescription,

    @NotBlank @Pattern(regexp = "BEGINNER|MODERATE|EXPERT") String level,
    @NotBlank @Pattern(regexp = "offered|wanted")           String type
) {
    public AddSkillRequest {
        if ((skillId == null || skillId.isBlank()) && (skillName == null || skillName.isBlank())) {
            throw new IllegalArgumentException("Either skillId or skillName must be provided.");
        }
    }
}
