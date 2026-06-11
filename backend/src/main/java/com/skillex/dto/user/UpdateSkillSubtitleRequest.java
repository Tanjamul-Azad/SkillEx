package com.skillex.dto.user;

import jakarta.validation.constraints.Size;

/**
 * Request body for PATCH /api/users/me/skills/{skillId}.
 * Updates the per-user description (subtitle) of an offered skill
 * without touching the proof video or triggering a showcase post.
 */
public record UpdateSkillSubtitleRequest(
    @Size(max = 500) String subtitle
) {
}
