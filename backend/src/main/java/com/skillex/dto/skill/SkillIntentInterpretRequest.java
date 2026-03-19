package com.skillex.dto.skill;

/**
 * Natural-language skill intent payload captured during onboarding.
 */
public record SkillIntentInterpretRequest(
    String teachText,
    String learnText
) {}
