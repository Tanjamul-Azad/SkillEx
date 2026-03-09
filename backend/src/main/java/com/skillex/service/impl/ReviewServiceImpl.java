package com.skillex.service.impl;

import com.skillex.dto.common.PagedResponse;
import com.skillex.dto.review.*;
import com.skillex.model.Review;
import com.skillex.model.Session;
import com.skillex.model.User;
import com.skillex.repository.ReviewRepository;
import com.skillex.repository.SessionRepository;
import com.skillex.repository.UserRepository;
import com.skillex.service.DtoMapper;
import com.skillex.service.ReviewService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@SuppressWarnings("null")
public class ReviewServiceImpl implements ReviewService {

    private final ReviewRepository reviewRepository;
    private final SessionRepository sessionRepository;
    private final UserRepository userRepository;
    private final DtoMapper mapper;

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<ReviewDto> getReviewsForUser(String userId, int page, int size) {
        var pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return PagedResponse.of(
            reviewRepository.findByToUserId(userId, pageable).map(mapper::toReview));
    }

    @Override
    @Transactional
    public ReviewDto create(String fromUserId, CreateReviewRequest req) {
        User fromUser = findUser(fromUserId);
        User toUser   = findUser(req.toUserId());
        Session session = sessionRepository.findById(req.sessionId())
            .orElseThrow(() -> new EntityNotFoundException("Session not found: " + req.sessionId()));

        // Prevent duplicate reviews for the same session from the same user
        if (reviewRepository.existsByFromUserIdAndSessionId(fromUserId, req.sessionId())) {
            throw new IllegalStateException("You have already reviewed this session.");
        }

        Review review = new Review();
        review.setId(UUID.randomUUID().toString());
        review.setFromUser(fromUser);
        review.setToUser(toUser);
        review.setSession(session);
        review.setRating(req.rating());
        review.setComment(req.comment());
        Review saved = reviewRepository.save(review);

        // Recalculate and persist the target user's average rating
        Double avg = reviewRepository.findAverageRatingByToUserId(req.toUserId());
        if (avg != null) {
            toUser.setRating(BigDecimal.valueOf(avg).setScale(1, java.math.RoundingMode.HALF_UP));
        }
        // Increment skillexScore for receiving a review
        if (toUser.getSkillexScore() == null) toUser.setSkillexScore(0);
        toUser.setSkillexScore(toUser.getSkillexScore() + 5);
        userRepository.save(toUser);

        return mapper.toReview(saved);
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private User findUser(String id) {
        return userRepository.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("User not found: " + id));
    }
}
