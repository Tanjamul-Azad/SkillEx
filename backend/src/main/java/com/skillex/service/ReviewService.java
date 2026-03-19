package com.skillex.service;

import com.skillex.dto.common.PagedResponse;
import com.skillex.dto.review.*;

/**
 * Contract for peer review (rating + feedback) operations.
 */
public interface ReviewService {

    PagedResponse<ReviewDto> getReviewsForUser(String userId, int page, int size);

    ReviewDto create(String fromUserId, CreateReviewRequest req);
}
