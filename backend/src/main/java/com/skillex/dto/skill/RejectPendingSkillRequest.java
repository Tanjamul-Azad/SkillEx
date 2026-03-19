package com.skillex.dto.skill;

import jakarta.validation.constraints.Size;

public record RejectPendingSkillRequest(
    @Size(max = 500) String reviewNote
) {}
