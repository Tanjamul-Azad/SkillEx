package com.skillex.dto.skill;

/**
 * Combined teach/learn interpretation response.
 */
public record SkillIntentInterpretResponse(
    SkillIntentInterpretResultDto teach,
    SkillIntentInterpretResultDto learn
) {}
