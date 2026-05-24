package com.skillex.dto.admin;

public record AdminOverviewDto(
    long totalUsers,
    long totalSessions,
    long totalReports,
    long openReports,
    long openCases,
    long activeRestrictions,
    long pendingSkills,
    long activeRules
) {}
