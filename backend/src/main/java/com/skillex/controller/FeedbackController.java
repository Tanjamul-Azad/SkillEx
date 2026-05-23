package com.skillex.controller;

import com.skillex.dto.common.ApiResponse;
import com.skillex.dto.feedback.CreateFeedbackRequest;
import com.skillex.dto.feedback.FeedbackDto;
import com.skillex.service.FeedbackService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for global platform feedbacks.
 * Base path: /api/feedbacks
 */
@RestController
@RequestMapping("/api/feedbacks")
@RequiredArgsConstructor
public class FeedbackController {

    private final FeedbackService feedbackService;

    /**
     * GET /api/feedbacks
     * Retrieves all user feedback in descending chronological order.
     * Publicly accessible.
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<FeedbackDto>>> getAllFeedback() {
        List<FeedbackDto> feedbacks = feedbackService.getAllFeedback();
        return ResponseEntity.ok(ApiResponse.ok(feedbacks));
    }

    /**
     * POST /api/feedbacks
     * Submits new feedback from a registered user.
     * Requires authentication.
     */
    @PostMapping
    public ResponseEntity<ApiResponse<FeedbackDto>> create(
        Authentication auth,
        @Valid @RequestBody CreateFeedbackRequest req
    ) {
        FeedbackDto dto = feedbackService.submitFeedback(userId(auth), req);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(dto));
    }

    private String userId(Authentication auth) {
        return (String) auth.getPrincipal();
    }
}
