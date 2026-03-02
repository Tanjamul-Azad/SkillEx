package com.skillex.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Request body for POST /api/auth/login */
public record LoginRequest(
    @NotBlank @Email
    String email,

    @NotBlank @Size(min = 6)
    String password
) {}
