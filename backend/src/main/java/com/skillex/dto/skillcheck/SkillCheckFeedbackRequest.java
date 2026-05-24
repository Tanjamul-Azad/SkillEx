package com.skillex.dto.skillcheck;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SkillCheckFeedbackRequest(
    @NotBlank String outcome,
    @Size(max = 1000) String comment
) {}
