package com.skillex.dto.analytics;

import java.util.List;

/**
 * Platform-wide analytics snapshot returned by GET /api/analytics/platform.
 *
 * @param mostDemandedSkills  top skills wanted by users (most learners seeking them)
 * @param mostTaughtSkills    top skills offered by users (platform content supply)
 * @param topMentors          users ranked by sessions completed + rating
 * @param totalUsers          total registered users
 * @param totalSessions       total completed sessions on the platform
 */
public record PlatformAnalyticsDto(
    List<SkillInsightDto>  mostDemandedSkills,
    List<SkillInsightDto>  mostTaughtSkills,
    List<MentorInsightDto> topMentors,
    long totalUsers,
    long totalSessions
) {}
