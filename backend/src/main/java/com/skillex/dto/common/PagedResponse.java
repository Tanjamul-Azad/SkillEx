package com.skillex.dto.common;

import org.springframework.data.domain.Page;

import java.util.List;

/**
 * Generic paginated response wrapper.
 * Used by all paginated list endpoints so the frontend gets consistent structure.
 */
public record PagedResponse<T>(
    List<T> content,
    int page,
    int size,
    long totalElements,
    int totalPages,
    boolean last
) {
    /** Convenience factory from a Spring Data Page object */
    public static <T> PagedResponse<T> of(Page<T> page) {
        return new PagedResponse<>(
            page.getContent(),
            page.getNumber(),
            page.getSize(),
            page.getTotalElements(),
            page.getTotalPages(),
            page.isLast()
        );
    }
}
