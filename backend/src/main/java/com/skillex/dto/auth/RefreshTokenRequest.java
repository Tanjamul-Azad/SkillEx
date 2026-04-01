package com.skillex.dto.auth;

import jakarta.validation.constraints.NotBlank;

/**
 * Request body for /api/auth/refresh.
 */
public record RefreshTokenRequest(
    @NotBlank String token
) {
}
