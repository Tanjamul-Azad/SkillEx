package com.skillex.dto.ai;

import java.util.List;

/**
 * DTO representing the full conversation history with the AI tutor for a skill.
 * Includes metadata about the conversation state.
 */
public record TutorConversationDto(
    /** Unique conversation identifier */
    String id,

    /** The skill being tutored */
    String skillId,

    /** Skill name for display */
    String skillName,

    /** User ID for this conversation */
    String userId,

    /** Full message history, ordered chronologically */
    List<TutorMessageDto> messages,

    /** Total number of quiz questions asked */
    Integer totalQuestionsAsked,

    /** Number of quiz questions answered correctly */
    Integer questionsAnsweredCorrectly,

    /** Accuracy percentage (0-100) */
    Double accuracyPercentage,

    /** Last interaction timestamp (ISO 8601) */
    String lastInteractionAt,

    /** Created timestamp (ISO 8601) */
    String createdAt,

    /** Whether the conversation is active */
    Boolean active
) {}
