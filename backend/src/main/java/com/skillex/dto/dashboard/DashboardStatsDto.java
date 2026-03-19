package com.skillex.dto.dashboard;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Response DTO for GET /api/dashboard/stats
 * Aggregates the key metrics shown on the authenticated user's dashboard.
 */
public record DashboardStatsDto(
    int sessionsCompleted,
    int skillexScore,
    BigDecimal rating,
    long pendingExchanges,
    long activeExchanges,
    List<ActivityItem> recentActivity
) {
    public record ActivityItem(
        String type,       // "exchange_received", "session_completed", "review_left", etc.
        String message,
        LocalDateTime createdAt
    ) {}
}
