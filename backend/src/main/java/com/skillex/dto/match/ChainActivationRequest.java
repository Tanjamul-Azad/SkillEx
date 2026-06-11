package com.skillex.dto.match;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * Request body for POST /api/match/chains/activate.
 * Carries the hops of a detected exchange cycle the caller wants to set in motion.
 * Each hop means "{fromUserId} teaches {skillId} to {toUserId}".
 */
public record ChainActivationRequest(
    @NotEmpty @Size(max = 6) List<Hop> hops,
    @Size(max = 500) String message
) {
    public record Hop(
        @NotBlank String fromUserId,
        @NotBlank String toUserId,
        @NotBlank String skillId
    ) {}
}
