package com.skillex.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * DTO for a single flashcard in study materials.
 * Represents a term/concept paired with its definition/explanation.
 */
public record FlashcardDto(
    @JsonProperty("id")
    String id,

    @JsonProperty("term")
    String term,

    @JsonProperty("definition")
    String definition,

    @JsonProperty("difficulty")
    String difficulty // EASY, MEDIUM, HARD
) {}
