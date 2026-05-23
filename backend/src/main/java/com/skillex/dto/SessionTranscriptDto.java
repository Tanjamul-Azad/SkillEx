package com.skillex.dto;

import java.time.LocalDateTime;

public record SessionTranscriptDto(
    Long id,
    String speakerUserId,
    String speakerRole,
    String speakerName,
    String content,
    LocalDateTime spokenAt,
    Double confidenceScore,
    String detectedLanguage
) {}
