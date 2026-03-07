package com.skillex.dto.user;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Full user profile response — used for GET /api/users/{id} and GET /api/users/me.
 * Never exposes passwordHash. Skills include proficiency level.
 */
public record UserProfileDto(
    String id,
    String name,
    String email,
    String avatar,
    String university,
    String bio,
    String role,
    String level,
    int skillexScore,
    int sessionsCompleted,
    BigDecimal rating,
    boolean isOnline,
    LocalDateTime joinedAt,
    List<SkillWithLevel> skillsOffered,
    List<SkillWithLevel> skillsWanted
) {
    public record SkillWithLevel(
        String id,
        String name,
        String icon,
        String category,
        String description,
        String level   // BEGINNER | MODERATE | EXPERT
    ) {}
}
