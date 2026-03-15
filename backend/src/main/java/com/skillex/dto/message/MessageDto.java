package com.skillex.dto.message;

import java.time.LocalDateTime;

/**
 * Response DTO for a single chat message.
 * Returned by both REST history endpoints and the WebSocket push.
 */
public record MessageDto(
    String id,
    String senderId,
    String receiverId,
    String content,
    /** "TEXT" or "IMAGE" */
    String type,
    String imageUrl,
    boolean isRead,
    LocalDateTime createdAt
) {}
