package com.skillex.dto.search;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;

/**
 * Request DTO for unified semantic search endpoint.
 */
public record UnifiedSearchRequest(
    @NotBlank(message = "Search query cannot be blank")
    String query,

    @Positive(message = "Limit must be positive")
    int limit
) {
    public UnifiedSearchRequest(String query, int limit) {
        this.query = query;
        this.limit = Math.min(limit, 50); // Cap at 50 per request
    }

    public UnifiedSearchRequest(String query) {
        this(query, 20);
    }
}
