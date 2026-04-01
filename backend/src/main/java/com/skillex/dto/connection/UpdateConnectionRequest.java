package com.skillex.dto.connection;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/** Request body for PATCH /api/connections/{id}/status */
public record UpdateConnectionRequest(
    @NotBlank @Pattern(regexp = "ACCEPTED|DECLINED|CANCELLED") String status
) {}
