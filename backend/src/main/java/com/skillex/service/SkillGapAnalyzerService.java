package com.skillex.service;

import com.skillex.dto.ai.SkillGapAnalysisDto;

import java.util.List;

public interface SkillGapAnalyzerService {
    /**
     * Analyze the gap between user's current skills and a goal skill.
     * Returns missing intermediate skills + mentors for each gap.
     *
     * @param userId current user
     * @param goalSkillId target skill to master
     * @return analysis with missing skills and mentor suggestions
     */
    SkillGapAnalysisDto analyzeGap(String userId, String goalSkillId);

    /**
     * Analyze a free-text goal skill. Unknown skills are submitted into the
     * catalog governance queue, but the user still receives an AI plan now.
     */
    SkillGapAnalysisDto analyzeCustomGoal(String userId, String goalSkillName, String category);

    /**
     * Generate a learning path from goal skill using AI.
     * Returns ordered steps with estimated hours.
     *
     * @param goalSkillName skill to learn
     * @param currentSkillNames skills already known
     * @return structured learning path
     */
    SkillGapAnalysisDto.LearningPath generatePath(String goalSkillName, List<String> currentSkillNames);
}
