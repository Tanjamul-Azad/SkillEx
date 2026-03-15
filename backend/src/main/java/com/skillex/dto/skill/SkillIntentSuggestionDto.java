package com.skillex.dto.skill;

/**
 * Single suggested catalog skill for a natural-language intent.
 */
public record SkillIntentSuggestionDto(
    String skillId,
    String skillName,
    String category,
    int confidence
) {}
