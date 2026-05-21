package com.skillex.dto;

import java.time.LocalDateTime;

public record SessionTranscriptDto(
    Long id,
    String speakerUserId,
    String speakerRole,
    String content,
    LocalDateTime spokenAt
) {}
