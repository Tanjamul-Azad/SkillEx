package com.skillex.dto.user;

/**
 * Compatibility result for a specific target user.
 */
public record MatchCompatibilityDto(
    String userId,
    int compatibilityScore,
    int semanticSimilarity,
    int intentSimilarity
) {
}
