package com.skillex.service;

import com.skillex.dto.analytics.ImpactStatsDto;
import com.skillex.dto.analytics.PlatformAnalyticsDto;

/**
 * Contract for platform-wide analytics and insight generation.
 *
 * @see com.skillex.service.impl.AnalyticsServiceImpl
 */
public interface AnalyticsService {

    /**
     * Build a platform analytics snapshot containing:
     * <ul>
     *   <li>The most demanded skills (most wanted by users)</li>
     *   <li>The most actively taught skills (most offered)</li>
     *   <li>The top mentors ranked by sessions + rating</li>
     *   <li>Platform totals (users, sessions)</li>
     * </ul>
     *
     * @param limit number of entries per leaderboard (e.g. 5)
     * @return populated {@link PlatformAnalyticsDto}
     */
    PlatformAnalyticsDto getPlatformAnalytics(int limit);

    /**
     * Build a public "economy at a glance" impact snapshot: learners, skills
     * exchanged, hours taught, tuition value saved, and community totals.
     *
     * @param topSkillsLimit number of top skills to include
     * @return populated {@link ImpactStatsDto}
     */
    ImpactStatsDto getImpactStats(int topSkillsLimit);
}
