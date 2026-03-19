package com.skillex.dto.review;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Request body for POST /api/reviews */
public record CreateReviewRequest(
    @NotBlank String sessionId,
    @NotBlank String toUserId,
    @NotBlank String skillId,
    @NotNull @Min(1) @Max(5) Integer rating,
    @Size(max = 1000) String comment
) {}
