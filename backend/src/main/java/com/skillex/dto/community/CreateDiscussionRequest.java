package com.skillex.dto.community;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Request body for POST /api/community/discussions */
public record CreateDiscussionRequest(
    @NotBlank @Size(max = 300) String title,
    @NotBlank @Size(max = 10000) String content,
    @Size(max = 100) String category
) {}
