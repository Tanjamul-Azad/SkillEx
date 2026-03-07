package com.skillex.service;

import com.skillex.dto.dashboard.DashboardStatsDto;

/**
 * Contract for aggregating a user's dashboard statistics.
 */
public interface DashboardService {

    DashboardStatsDto getStats(String userId);
}
