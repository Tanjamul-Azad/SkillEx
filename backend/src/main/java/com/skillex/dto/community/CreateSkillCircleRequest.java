package com.skillex.dto.community;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * Request for creating a new skill circle.
 */
public record CreateSkillCircleRequest(
    @NotBlank @Size(max = 120) String name,
    @Size(max = 2000) String description,
    @Size(max = 40) String icon,
    List<String> skillIds
) {
}
