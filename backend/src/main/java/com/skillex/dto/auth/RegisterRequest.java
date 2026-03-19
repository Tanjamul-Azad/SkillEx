package com.skillex.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Request body for POST /api/auth/register */
public record RegisterRequest(
    @NotBlank @Size(min = 2, max = 100)
    String name,

    @NotBlank @Email
    String email,

    @NotBlank @Size(min = 8, max = 72)
    String password,

    String university,

    /** Name of the skill the user wants to teach (matched by name, case-insensitive) */
    String skillToTeach,

    /** Name of the skill the user wants to learn */
    String skillToLearn,

    /** Proficiency level: BEGINNER | MODERATE | EXPERT */
    String level
) {}
