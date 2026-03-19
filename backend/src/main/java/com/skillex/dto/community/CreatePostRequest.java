package com.skillex.dto.community;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Request body for POST /api/community/posts */
public record CreatePostRequest(
    @NotBlank @Pattern(regexp = "SHOWCASE|ACHIEVEMENT|EXCHANGE|QUESTION") String type,
    @NotBlank @Size(max = 5000) String content,
    String skillId,   // optional
    @Size(max = 100) String badge  // optional — for ACHIEVEMENT type
) {}
