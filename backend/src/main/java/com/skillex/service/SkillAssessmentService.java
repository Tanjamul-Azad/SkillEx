package com.skillex.service;

import com.skillex.dto.ai.SkillAssessmentDto;

public interface SkillAssessmentService {
    /**
     * Generate a skill assessment quiz (auto-graded via AI).
     * Used to verify capability before issuing a certificate.
     *
     * @param userId user taking the assessment
     * @param skillId skill to assess
     * @param difficulty beginner/intermediate/advanced
     * @return assessment with quiz questions
     */
    SkillAssessmentDto generateAssessment(String userId, String skillId, String difficulty);

    /**
     * Submit assessment answers and get auto-graded result.
     *
     * @param assessmentId assessment ID
     * @param answers map of questionId → userAnswer
     * @return graded assessment with score
     */
    SkillAssessmentDto.GradedAssessment submitAnswers(String assessmentId, java.util.Map<String, String> answers);

    /**
     * Get assessment result for a user's skill.
     *
     * @param userId user
     * @param skillId skill
     * @return latest assessment result or null
     */
    SkillAssessmentDto.GradedAssessment getLatestResult(String userId, String skillId);
}
