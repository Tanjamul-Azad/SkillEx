package com.skillex.dto.user;

import java.util.List;

/**
 * Skill lists for a specific user.
 */
public record UserSkillsDto(
    List<UserProfileDto.SkillWithLevel> offered,
    List<UserProfileDto.SkillWithLevel> wanted
) {
}
