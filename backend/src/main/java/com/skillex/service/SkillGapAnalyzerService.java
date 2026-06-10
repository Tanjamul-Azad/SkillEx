package com.skillex.service;

import com.skillex.dto.ai.SkillGapAnalysisDto;
import com.skillex.dto.ai.SkillGapDto;
import com.skillex.dto.match.MatchUserDto;

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
     * Generate a learning path from goal skill using AI.
     * Returns ordered steps with estimated hours.
     *
     * @param goalSkillName skill to learn
     * @param currentSkillNames skills already known
     * @return structured learning path
     */
    SkillGapAnalysisDto.LearningPath generatePath(String goalSkillName, List<String> currentSkillNames);
}
