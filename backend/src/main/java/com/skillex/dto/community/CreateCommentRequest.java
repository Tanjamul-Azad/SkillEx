package com.skillex.dto.community;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Request body for POST /api/community/posts/{postId}/comments */
public record CreateCommentRequest(
    @NotBlank @Size(max = 2000) String content
) {}
