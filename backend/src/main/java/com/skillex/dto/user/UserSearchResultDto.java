package com.skillex.dto.user;

import java.math.BigDecimal;
import java.util.List;

/**
 * Search card DTO for the global People search experience.
 */
public record UserSearchResultDto(
    String id,
    String displayName,
    String username,
    String avatar,
    String university,
    int reputationScore,
    BigDecimal rating,
    int sessionsCompleted,
    int matchPercent,
    boolean isOnline,
    List<String> topSkillsOffered,
    List<String> topSkillsWanted
) {}
