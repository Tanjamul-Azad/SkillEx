package com.skillex.dto.auth;

import com.skillex.dto.user.UserProfileDto;

/**
 * Response body for login and register.
 * Carries JWT token + full user profile (including skills) so the frontend
 * never needs a second /users/me round-trip after login.
 */
public record AuthResponse(
    String token,
    UserProfileDto user
) {}
