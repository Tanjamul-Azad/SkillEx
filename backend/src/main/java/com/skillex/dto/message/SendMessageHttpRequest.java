package com.skillex.dto.message;

import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Pattern;

/**
 * REST payload for POST /api/messages/{userId}.
 */
public record SendMessageHttpRequest(
    @Size(max = 4000) String content,
    @Pattern(regexp = "TEXT|IMAGE", flags = Pattern.Flag.CASE_INSENSITIVE) String type,
    @Size(max = 500) String imageUrl
) {
}
