package com.skillex.service;

import com.skillex.dto.ai.TutorConversationDto;
import com.skillex.dto.ai.TutorMessageDto;

import java.util.List;

/**
 * Service interface for AI Tutor Bot functionality.
 * Manages stateful conversations with the AI tutor per skill.
 */
public interface TutorBotService {

    /**
     * Send a message to the tutor for a skill and get a response.
     * Creates or retrieves the conversation context, loads session notes, and generates a tutor response.
     *
     * @param userId The user sending the message
     * @param skillId The skill being discussed
     * @param messageContent The user's message
     * @return The tutor's response with optional quiz metadata
     */
    TutorMessageDto sendMessage(String userId, String skillId, String messageContent);

    /**
     * Get the full conversation history for a user and skill.
     *
     * @param userId The user
     * @param skillId The skill
     * @return The full conversation DTO with history and stats
     */
    TutorConversationDto getConversation(String userId, String skillId);

    /**
     * Get all conversations for a user
     *
     * @param userId The user
     * @return List of all conversations ordered by last interaction
     */
    List<TutorConversationDto> getUserConversations(String userId);

    /**
     * Delete a conversation
     *
     * @param userId The user
     * @param skillId The skill
     */
    void deleteConversation(String userId, String skillId);

    /**
     * Clear all messages in a conversation (reset conversation but keep stats)
     *
     * @param userId The user
     * @param skillId The skill
     */
    void clearConversationMessages(String userId, String skillId);

    /**
     * Record a quiz answer and return feedback
     *
     * @param userId The user
     * @param skillId The skill
     * @param messageId The message ID of the quiz question
     * @param answerIndex The selected answer index (for multiple choice)
     * @param answerText The answer text (for short answer)
     * @return Feedback message from the tutor
     */
    TutorMessageDto submitQuizAnswer(String userId, String skillId, String messageId, Integer answerIndex, String answerText);
}
