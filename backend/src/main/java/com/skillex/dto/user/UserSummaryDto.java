package com.skillex.dto.user;

import java.math.BigDecimal;

/**
 * Lightweight user snapshot — used in lists, exchange cards, leaderboards, etc.
 * Does not include skills or session history.
 */
public record UserSummaryDto(
    String id,
    String name,
    String avatar,
    String university,
    String level,
    int skillexScore,
    BigDecimal rating,
    boolean isOnline
) {}
