package com.skillex.controller;

import com.skillex.dto.ai.TutorConversationDto;
import com.skillex.dto.ai.TutorMessageDto;
import com.skillex.dto.common.ApiResponse;
import com.skillex.service.TutorBotService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for AI Tutor Bot endpoints.
 * Manages conversational learning interactions with the tutor AI.
 */
@RestController
@RequestMapping("/api/tutor")
@RequiredArgsConstructor
@Slf4j
public class TutorBotController {

    private final TutorBotService tutorBotService;

    /**
     * Send a message to the tutor for a skill
     * POST /api/tutor/{skillId}/message
     *
     * @param skillId The skill ID
     * @param request The message content
     * @param auth The authenticated user
     * @return The tutor's response
     */
    @PostMapping("/{skillId}/message")
    public ResponseEntity<ApiResponse<TutorMessageDto>> sendMessage(
        @PathVariable String skillId,
        @Valid @RequestBody SendMessageRequest request,
        Authentication auth
    ) {
        String userId = (String) auth.getPrincipal();
        log.info("[TutorBot] Message from user {} for skill {}", userId, skillId);

        TutorMessageDto response = tutorBotService.sendMessage(userId, skillId, request.message());
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    /**
     * Get conversation history for a skill
     * GET /api/tutor/{skillId}/history
     *
     * @param skillId The skill ID
     * @param auth The authenticated user
     * @return The full conversation DTO
     */
    @GetMapping("/{skillId}/history")
    public ResponseEntity<ApiResponse<TutorConversationDto>> getConversation(
        @PathVariable String skillId,
        Authentication auth
    ) {
        String userId = (String) auth.getPrincipal();
        log.info("[TutorBot] Fetching conversation for user {} and skill {}", userId, skillId);

        TutorConversationDto conversation = tutorBotService.getConversation(userId, skillId);
        return ResponseEntity.ok(ApiResponse.ok(conversation));
    }

    /**
     * Get all tutor conversations for the user
     * GET /api/tutor/conversations/all
     *
     * @param auth The authenticated user
     * @return List of all conversations
     */
    @GetMapping("/conversations/all")
    public ResponseEntity<ApiResponse<List<TutorConversationDto>>> getAllConversations(
        Authentication auth
    ) {
        String userId = (String) auth.getPrincipal();
        log.info("[TutorBot] Fetching all conversations for user {}", userId);

        List<TutorConversationDto> conversations = tutorBotService.getUserConversations(userId);
        return ResponseEntity.ok(ApiResponse.ok(conversations));
    }

    /**
     * Delete a conversation
     * DELETE /api/tutor/{skillId}
     *
     * @param skillId The skill ID
     * @param auth The authenticated user
     * @return Success response
     */
    @DeleteMapping("/{skillId}")
    public ResponseEntity<ApiResponse<Void>> deleteConversation(
        @PathVariable String skillId,
        Authentication auth
    ) {
        String userId = (String) auth.getPrincipal();
        log.info("[TutorBot] Deleting conversation for user {} and skill {}", userId, skillId);

        tutorBotService.deleteConversation(userId, skillId);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    /**
     * Clear conversation messages (reset but keep stats)
     * POST /api/tutor/{skillId}/clear
     *
     * @param skillId The skill ID
     * @param auth The authenticated user
     * @return Success response
     */
    @PostMapping("/{skillId}/clear")
    public ResponseEntity<ApiResponse<Void>> clearConversation(
        @PathVariable String skillId,
        Authentication auth
    ) {
        String userId = (String) auth.getPrincipal();
        log.info("[TutorBot] Clearing conversation messages for user {} and skill {}", userId, skillId);

        tutorBotService.clearConversationMessages(userId, skillId);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    /**
     * Submit a quiz answer and get feedback
     * POST /api/tutor/{skillId}/quiz-answer
     *
     * @param skillId The skill ID
     * @param request The quiz answer submission
     * @param auth The authenticated user
     * @return The feedback message
     */
    @PostMapping("/{skillId}/quiz-answer")
    public ResponseEntity<ApiResponse<TutorMessageDto>> submitQuizAnswer(
        @PathVariable String skillId,
        @Valid @RequestBody SubmitQuizAnswerRequest request,
        Authentication auth
    ) {
        String userId = (String) auth.getPrincipal();
        log.info("[TutorBot] Submitting quiz answer for user {} and skill {}", userId, skillId);

        TutorMessageDto feedback = tutorBotService.submitQuizAnswer(
            userId,
            skillId,
            request.messageId(),
            request.answerIndex(),
            request.answerText()
        );
        return ResponseEntity.ok(ApiResponse.ok(feedback));
    }

    // DTOs

    record SendMessageRequest(
        @Valid String message
    ) {}

    record SubmitQuizAnswerRequest(
        String messageId,
        Integer answerIndex,
        String answerText
    ) {}
}
