package com.skillex.dto.ai;

import jakarta.validation.constraints.NotBlank;

public record AiHelperRequest(
    @NotBlank String contextType,
    @NotBlank String prompt,
    String pagePath,
    String relatedEntityId
) {}
