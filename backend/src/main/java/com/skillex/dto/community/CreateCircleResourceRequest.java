package com.skillex.dto.community;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateCircleResourceRequest(
    @NotBlank @Size(max = 200) String title,
    @Size(max = 500) String url,
    @Size(max = 5000) String notes,
    String resourceType,
    String difficulty,
    String skillId
) {}
