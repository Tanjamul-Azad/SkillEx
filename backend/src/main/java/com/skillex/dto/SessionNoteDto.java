package com.skillex.dto;

import java.time.LocalDateTime;

public record SessionNoteDto(
    String sessionId,
    String keyConcepts,
    String actionItems,
    String resourcesMentioned,
    String summary,
    String detailedNotes,
    LocalDateTime generatedAt
) {}
