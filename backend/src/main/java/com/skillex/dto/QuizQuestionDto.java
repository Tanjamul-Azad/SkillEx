package com.skillex.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

/**
 * DTO for a single multiple-choice quiz question.
 * Includes the question stem, choices, and correct answer index.
 */
public record QuizQuestionDto(
    @JsonProperty("id")
    String id,

    @JsonProperty("question")
    String question,

    @JsonProperty("choices")
    List<String> choices,

    @JsonProperty("correctAnswerIndex")
    int correctAnswerIndex,

    @JsonProperty("explanation")
    String explanation,

    @JsonProperty("difficulty")
    String difficulty // EASY, MEDIUM, HARD
) {}
