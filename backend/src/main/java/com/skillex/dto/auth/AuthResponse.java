package com.skillex.dto.auth;

/** Response body for login and register — carries JWT token + user snapshot */
public record AuthResponse(
    String token,
    UserSnapshot user
) {
    public record UserSnapshot(
        String id,
        String name,
        String email,
        String university,
        String avatarUrl,
        String role,
        int skillexScore,
        int sessionsCompleted
    ) {}
}
