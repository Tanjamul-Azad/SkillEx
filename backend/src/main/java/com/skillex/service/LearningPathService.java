package com.skillex.service;

import com.skillex.dto.ai.LearningPathDto;
import java.util.List;

public interface LearningPathService {
    /**
     * Generate a personalized, bookable learning path to master a goal skill.
     * Auto-matches mentors for each step and schedules intro calls.
     *
     * @param userId current user
     * @param goalSkillId target skill
     * @param targetLevel beginner/intermediate/advanced/expert
     * @return complete path with matched mentors, scheduled steps
     */
    LearningPathDto generateAndSchedulePath(String userId, String goalSkillId, String targetLevel);

    /**
     * List all active learning paths for a user.
     *
     * @param userId user
     * @return active paths with progress
     */
    List<LearningPathDto> listUserPaths(String userId);

    /**
     * Mark a learning path step as completed.
     *
     * @param pathId path ID
     * @param stepOrder which step (1-indexed)
     */
    void completeStep(String pathId, int stepOrder);

    /**
     * Cancel an active learning path.
     *
     * @param pathId path ID
     */
    void cancelPath(String pathId);
}
