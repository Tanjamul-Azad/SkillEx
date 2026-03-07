package com.skillex.dto.community;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;
import java.util.List;

/** Request body for POST /api/community/events */
public record CreateEventRequest(
    @NotBlank @Size(max = 200) String title,
    @Size(max = 2000) String description,
    @NotNull @Future LocalDateTime eventDate,
    @Size(max = 300) String location,
    boolean isOnline,
    @Size(max = 200) String coverGradient,
    List<String> skillIds   // optional list of skill IDs to associate
) {}
