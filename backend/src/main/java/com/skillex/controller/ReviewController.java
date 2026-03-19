package com.skillex.controller;

import com.skillex.dto.common.ApiResponse;
import com.skillex.dto.common.PagedResponse;
import com.skillex.dto.review.*;
import com.skillex.service.ReviewService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

/**
 * REST controller for peer reviews.
 * Base path: /api/reviews
 */
@RestController
@RequestMapping("/api/reviews")
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewService reviewService;

    /** GET /api/reviews?userId=&page=0&size=20 — reviews received by a user */
    @GetMapping
    public ResponseEntity<ApiResponse<PagedResponse<ReviewDto>>> listForUser(
        @RequestParam String userId,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            reviewService.getReviewsForUser(userId, page, size)));
    }

    /** POST /api/reviews — submit a review */
    @PostMapping
    public ResponseEntity<ApiResponse<ReviewDto>> create(
        Authentication auth,
        @Valid @RequestBody CreateReviewRequest req
    ) {
        ReviewDto dto = reviewService.create(userId(auth), req);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(dto));
    }

    private String userId(Authentication auth) {
        return (String) auth.getPrincipal();
    }
}
