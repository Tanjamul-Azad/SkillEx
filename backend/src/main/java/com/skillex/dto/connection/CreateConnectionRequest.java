package com.skillex.dto.connection;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Request body for POST /api/connections */
public record CreateConnectionRequest(
    @NotBlank String receiverId,
    @Size(max = 1000) String message
) {}
