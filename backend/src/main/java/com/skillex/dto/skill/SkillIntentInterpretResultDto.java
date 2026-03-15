package com.skillex.dto.skill;

import java.util.List;

/**
 * Interpretation result for one side of the exchange intent (teach or learn).
 */
public record SkillIntentInterpretResultDto(
    String rawText,
    String inferredLevel,
    SkillIntentSuggestionDto primary,
    List<SkillIntentSuggestionDto> alternatives
) {}
