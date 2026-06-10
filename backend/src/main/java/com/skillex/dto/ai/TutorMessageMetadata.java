package com.skillex.dto.ai;

import java.util.List;

/**
 * Optional metadata attached to tutor messages.
 * Used to provide context about quiz mode, suggestions, and citations.
 */
public record TutorMessageMetadata(
    /** Whether this message is part of a quiz */
    Boolean isQuiz,

    /** The type of quiz if applicable: 'multiple-choice', 'short-answer', 'true-false' */
    String quizType,

    /** For quiz questions: list of options */
    List<String> quizOptions,

    /** For quiz questions: index of the correct answer (0-based) */
    Integer correctAnswerIndex,

    /** Whether this quiz has been answered yet */
    Boolean answered,

    /** User's selected answer index (if answered) */
    Integer userAnswerIndex,

    /** Feedback on the answer */
    String answerFeedback,

    /** Session notes referenced in this response */
    List<String> citedSessions,

    /** Skill being discussed */
    String skillName,

    /** Suggested follow-up actions */
    List<String> suggestedFollowUps
) {}
