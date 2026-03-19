package com.skillex.dto.user;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

/**
 * Request body for POST /api/users/me/skills.
 * Provide either {@code skillId} (existing catalog skill) OR
 * {@code skillName} (unknown skills are queued for governance review / auto-promotion).
 */
public record AddSkillRequest(
    String skillId,

    @Size(max = 100) String skillName,
    @Size(max = 50)  String skillCategory,
    @Size(max = 500) String skillDescription,
    @Size(max = 500) String sourceIntent,
    @Min(0) @Max(100) Integer matchConfidence,

    @NotBlank @Pattern(regexp = "BEGINNER|MODERATE|EXPERT") String level,
    @NotBlank @Pattern(regexp = "offered|wanted")           String type
) {
    public AddSkillRequest {
        if ((skillId == null || skillId.isBlank()) && (skillName == null || skillName.isBlank())) {
            throw new IllegalArgumentException("Either skillId or skillName must be provided.");
        }
    }
}
