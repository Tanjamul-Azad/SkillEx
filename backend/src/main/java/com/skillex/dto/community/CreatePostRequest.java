package com.skillex.dto.community;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Request body for POST /api/community/posts */
public record CreatePostRequest(
    @NotBlank @Pattern(regexp = "(?i)showcase|achievement|exchange|question") String type,
    @NotBlank @Size(max = 5000) String content,
    String skillId,   // optional
    @Size(max = 100) String badge,  // optional — for ACHIEVEMENT type
    @Size(max = 2000) String mediaUrl // optional — for SHOWCASE or general media
) {}
