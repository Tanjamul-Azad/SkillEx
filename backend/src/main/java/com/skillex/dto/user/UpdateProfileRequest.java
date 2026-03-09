package com.skillex.dto.user;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;

/**
 * Request body for PATCH /api/users/me
 * All fields optional — only non-null values are applied (patch semantics in service layer).
 */
public record UpdateProfileRequest(
    @Size(min = 2, max = 100) String name,
    @Email @Size(max = 255)   String email,
    @Size(max = 200)          String university,
    @Size(max = 500)          String bio,
    @Size(max = 500)          String avatar
) {}
