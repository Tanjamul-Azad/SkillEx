package com.skillex.dto.message;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * WebSocket message payload sent by the client to /app/chat.send.
 */
public record SendMessageRequest(
    @NotBlank String toUserId,
    @Size(max = 4000) String content,
    /** "TEXT" (default) or "IMAGE" */
    String type,
    /** Optional image URL for image messages */
    String imageUrl
) {}
