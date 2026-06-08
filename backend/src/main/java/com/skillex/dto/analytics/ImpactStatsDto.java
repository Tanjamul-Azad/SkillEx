package com.skillex.dto.analytics;

import java.util.List;

/**
 * Public "economy at a glance" impact snapshot returned by GET /api/analytics/impact.
 *
 * Turns the abstract "cashless skill economy" into concrete numbers a judge remembers:
 * how many learners, how many skills traded, hours taught, and the real-money tuition
 * value that changed hands as knowledge instead of cash.
 *
 * @param learners              total registered members
 * @param skillsExchanged       completed teaching sessions (each = one skill taught)
 * @param hoursTaught           total taught hours across completed sessions
 * @param tuitionValueSavedUsd  hoursTaught x peer-tutoring market rate (USD) — money NOT spent
 * @param mentorCertificates    verifiable skill certificates issued
 * @param skillCircles          active learning communities
 * @param communityThreads      discussions + posts created
 * @param connectionsMade       peer connections formed
 * @param skillsInCatalog       distinct skills tradable on the platform
 * @param topSkills             most-taught skills (supply signal)
 */
public record ImpactStatsDto(
    long learners,
    long skillsExchanged,
    long hoursTaught,
    long tuitionValueSavedUsd,
    long mentorCertificates,
    long skillCircles,
    long communityThreads,
    long connectionsMade,
    long skillsInCatalog,
    List<SkillInsightDto> topSkills
) {}
