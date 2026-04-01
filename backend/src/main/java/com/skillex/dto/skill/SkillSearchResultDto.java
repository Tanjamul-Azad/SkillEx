package com.skillex.dto.skill;

/**
 * Result row for semantic intent-based skill search.
 */
public record SkillSearchResultDto(
    String skillId,
    String name,
    String category,
    String icon,
    String description,
    double similarity
) {
}
