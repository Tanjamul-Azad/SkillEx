package com.skillex.dto.analytics;

/**
 * One entry in the demanded/taught skill leaderboard.
 *
 * @param skillId    Skill entity ID
 * @param skillName  Human-readable skill name
 * @param category   Skill category (Tech, Design, etc.)
 * @param count      Number of users who want / offer this skill
 */
public record SkillInsightDto(
    String skillId,
    String skillName,
    String category,
    long   count
) {}
