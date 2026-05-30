package com.skillex.dto.progress;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record UserProgressDto(
    String userId,
    int totalXp,
    int currentLevel,
    int xpIntoLevel,
    int xpForNextLevel,
    int levelProgressPercent,
    int currentStreakDays,
    int longestStreakDays,
    int weeklyGoal,
    LocalDate lastActivityDate,
    LocalDateTime updatedAt
) {}
