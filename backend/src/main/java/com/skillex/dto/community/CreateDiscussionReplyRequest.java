package com.skillex.dto.community;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateDiscussionReplyRequest(
    @NotBlank @Size(max = 10000) String content
) {}
