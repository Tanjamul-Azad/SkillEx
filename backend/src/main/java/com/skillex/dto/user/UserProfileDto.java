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
    String username,
    String email,
    String avatar,
    String university,
    String location,
    String phone,
    String address,
    String bio,
    String teachIntentText,
    String learnIntentText,
    String githubUrl,
    String linkedinUrl,
    String facebookUrl,
    String websiteUrl,
    String resumeUrl,
    String role,
    String level,
    int skillexScore,
    int sessionsCompleted,
    BigDecimal rating,
    boolean isOnline,
    boolean connectionsPublic,
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
        String level,  // BEGINNER | MODERATE | EXPERT
        String proofVideoUrl,
        String subtitle
    ) {}
}
