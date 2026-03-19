package com.skillex.dto.analytics;

import java.math.BigDecimal;
import java.util.List;

/**
 * One entry in the top-mentors leaderboard.
 *
 * @param userId            User ID
 * @param name              Display name
 * @param avatar            Avatar URL (nullable)
 * @param university        University (nullable)
 * @param sessionsCompleted Total sessions this mentor has taught
 * @param rating            Average rating on a 0–5 scale
 * @param skillexScore      Accumulated platform reputation score
 * @param topSkills         Up to 3 skills they teach (for display)
 */
public record MentorInsightDto(
    String         userId,
    String         name,
    String         avatar,
    String         university,
    int            sessionsCompleted,
    BigDecimal     rating,
    int            skillexScore,
    List<String>   topSkills
) {}
