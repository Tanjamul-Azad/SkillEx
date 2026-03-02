package com.skillex.dto.common;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * Generic API response envelope.
 *
 * <pre>
 * { "success": true,  "data": { ... } }
 * { "success": false, "message": "Not found" }
 * </pre>
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiResponse<T>(
    boolean success,
    T data,
    String message
) {
    // ── Factory helpers ──────────────────────────────────────────────────────

    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(true, data, null);
    }

    public static <T> ApiResponse<T> created(T data) {
        return new ApiResponse<>(true, data, null);
    }

    public static ApiResponse<Void> error(String message) {
        return new ApiResponse<>(false, null, message);
    }
}
