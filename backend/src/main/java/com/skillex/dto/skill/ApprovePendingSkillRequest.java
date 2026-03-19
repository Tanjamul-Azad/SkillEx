package com.skillex.dto.skill;

import jakarta.validation.constraints.Size;

public record ApprovePendingSkillRequest(
    @Size(max = 50) String category,
    @Size(max = 100) String icon,
    @Size(max = 500) String description,
    @Size(max = 500) String reviewNote
) {}
