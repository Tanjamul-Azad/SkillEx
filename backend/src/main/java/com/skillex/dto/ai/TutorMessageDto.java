package com.skillex.dto.ai;

import jakarta.validation.constraints.NotBlank;

/**
 * Request/Response DTO for tutor bot messages.
 * Represents a single turn in a conversation with the AI tutor.
 */
public record TutorMessageDto(
    /** Unique message identifier */
    String id,

    /** The content of the message */
    @NotBlank(message = "Message content cannot be blank")
    String content,

    /** Who sent the message: 'user' or 'tutor' */
    String role,

    /** ISO 8601 timestamp of when the message was created */
    String createdAt,

    /** Optional metadata for quiz/question responses */
    TutorMessageMetadata metadata
) {
    /**
     * Constructor for creating a user message
     */
    public static TutorMessageDto userMessage(String content) {
        return new TutorMessageDto(null, content, "user", null, null);
    }

    /**
     * Constructor for creating a tutor response
     */
    public static TutorMessageDto tutorMessage(String content, TutorMessageMetadata metadata) {
        return new TutorMessageDto(null, content, "tutor", null, metadata);
    }
}
