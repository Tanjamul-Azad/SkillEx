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

    @NotBlank @Size(min = 6, max = 72)
    String password,

    String university
) {}
