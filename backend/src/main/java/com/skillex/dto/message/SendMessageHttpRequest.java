package com.skillex.dto.message;

import jakarta.validation.constraints.Size;

/**
 * REST payload for POST /api/messages/{userId}.
 */
public record SendMessageHttpRequest(
    @Size(max = 4000) String content,
    String type,
    String imageUrl
) {
}
