package com.skillex.dto.ai;

import java.util.List;

/**
 * Represents suggestions for profile content from AI.
 * Used for bio, skill descriptions, and circle blurbs.
 */
public record ProfileAssistantSuggestionDto(
    List<String> suggestions,
    String generatedAt,
    String model
) {}
