package com.skillex.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.LocalDate;

/**
 * DTO for action items extracted from session notes.
 * Represents a concrete task with optional due date and owner.
 */
public record ActionItemDto(
    @JsonProperty("id")
    String id,

    @JsonProperty("description")
    String description,

    @JsonProperty("owner")
    String owner, // "Learner", "Teacher", or specific participant name

    @JsonProperty("dueDate")
    LocalDate dueDate,

    @JsonProperty("priority")
    String priority // "LOW", "MEDIUM", "HIGH"
) {}
