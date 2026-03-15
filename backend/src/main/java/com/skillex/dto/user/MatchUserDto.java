package com.skillex.dto.user;

import java.math.BigDecimal;
import java.util.List;

/**
 * Match result for the GET /api/match/users endpoint.
 * Extends UserSummaryDto data inline with compatibility info.
 */
public record MatchUserDto(
    String id,
    String name,
    String avatar,
    String university,
    String level,
    int skillexScore,
    BigDecimal rating,
    boolean isOnline,
    int sessionsCompleted,
    int compatibilityScore,          // 0–100
    int semanticSimilarity,          // 0–100 semantic alignment percent
    String strategyUsed,             // basic | smart-ai
    List<String> teachesYou,         // skills they offer that you want
    List<String> wantsToLearnFromYou,// skills they want that you offer
    List<String> matchReasons        // explainable reasons shown in UI
) {}
