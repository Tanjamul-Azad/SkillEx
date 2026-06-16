package com.skillex.dto.auth;

import com.skillex.dto.user.UserProfileDto;

/**
 * Response body for login and register.
 * Carries a short-lived access {@code token}, a long-lived {@code refreshToken}
 * (exchangeable at /api/auth/refresh), and the full user profile (including skills)
 * so the frontend never needs a second /users/me round-trip after login.
 */
public record AuthResponse(
    String token,
    String refreshToken,
    UserProfileDto user
) {}
