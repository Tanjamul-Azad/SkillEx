package com.skillex.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Comprehensive DTO containing all study materials extracted from a session note.
 * Wraps flashcards, quiz questions, and action items into a single response object.
 */
public record StudyMaterialDto(
    @JsonProperty("sessionId")
    String sessionId,

    @JsonProperty("skillName")
    String skillName,

    @JsonProperty("flashcards")
    List<FlashcardDto> flashcards,

    @JsonProperty("quizQuestions")
    List<QuizQuestionDto> quizQuestions,

    @JsonProperty("actionItems")
    List<ActionItemDto> actionItems,

    @JsonProperty("generatedAt")
    LocalDateTime generatedAt
) {}
