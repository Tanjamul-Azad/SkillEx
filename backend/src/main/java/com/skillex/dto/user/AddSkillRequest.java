package com.skillex.dto.user;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/**
 * Request body for POST /api/users/{id}/skills
 * level must be BEGINNER, MODERATE, or EXPERT
 * type must be "offered" or "wanted"
 */
public record AddSkillRequest(
    @NotBlank String skillId,
    @NotBlank @Pattern(regexp = "BEGINNER|MODERATE|EXPERT") String level,
    @NotBlank @Pattern(regexp = "offered|wanted")           String type
) {}
