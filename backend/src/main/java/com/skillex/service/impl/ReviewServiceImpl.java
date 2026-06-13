package com.skillex.service.impl;

import com.skillex.dto.common.PagedResponse;
import com.skillex.dto.review.*;
import com.skillex.model.Review;
import com.skillex.model.Session;
import com.skillex.model.Skill;
import com.skillex.model.User;
import com.skillex.repository.SkillRepository;
import com.skillex.repository.ReviewRepository;
import com.skillex.repository.SessionRepository;
import com.skillex.repository.UserRepository;
import com.skillex.service.AccountRestrictionService;
import com.skillex.service.CertificateService;
import com.skillex.service.DtoMapper;
import com.skillex.service.ProgressService;
import com.skillex.service.ReviewService;
import com.skillex.service.reputation.ReputationUpdateEvent;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
public class ReviewServiceImpl implements ReviewService {

    private final ReviewRepository reviewRepository;
    private final SessionRepository sessionRepository;
    private final SkillRepository skillRepository;
    private final UserRepository userRepository;
    private final DtoMapper mapper;
    private final ApplicationEventPublisher eventPublisher;
    private final AccountRestrictionService restrictionService;
    private final CertificateService certificateService;
    private final ProgressService progressService;

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
        restrictionService.assertCanUseAccount(fromUserId, "REVIEW");
        User fromUser = findUser(fromUserId);
        User toUser   = findUser(req.toUserId());
        Skill skill = skillRepository.findById(req.skillId())
            .orElseThrow(() -> new EntityNotFoundException("Skill not found: " + req.skillId()));
        Session session = sessionRepository.findById(req.sessionId())
            .orElseThrow(() -> new EntityNotFoundException("Session not found: " + req.sessionId()));

        boolean fromIsTeacher = session.getTeacher().getId().equals(fromUserId);
        boolean fromIsLearner = session.getLearner().getId().equals(fromUserId);
        if (!fromIsTeacher && !fromIsLearner) {
            throw new org.springframework.security.access.AccessDeniedException("You are not a participant of this session.");
        }

        String expectedRecipientId = fromIsTeacher ? session.getLearner().getId() : session.getTeacher().getId();
        if (!expectedRecipientId.equals(req.toUserId())) {
            throw new IllegalArgumentException("Review recipient must be your session partner.");
        }

        if (!session.getSkill().getId().equals(req.skillId())) {
            throw new IllegalArgumentException("Review skill must match the completed session skill.");
        }

        if (session.getStatus() != Session.SessionStatus.COMPLETED) {
            throw new IllegalStateException("Reviews can only be submitted after a completed session.");
        }

        // Prevent duplicate reviews for the same session from the same user
        if (reviewRepository.existsByFromUserIdAndSessionId(fromUserId, req.sessionId())) {
            throw new IllegalStateException("You have already reviewed this session.");
        }

        Review review = new Review();
        review.setFromUser(fromUser);
        review.setToUser(toUser);
        review.setSkill(skill);
        review.setSession(session);
        review.setRating(req.rating());
        review.setComment(req.comment());
        Review saved = reviewRepository.save(review);

        // Recalculate and persist the target user's average rating
        Double avg = reviewRepository.findAverageRatingByToUserId(req.toUserId());
        if (avg != null) {
            toUser.setRating(BigDecimal.valueOf(avg).setScale(1, java.math.RoundingMode.HALF_UP));
        }
        userRepository.save(toUser);

        // Publish reputation update event — ReputationServiceImpl will recompute skillexScore
        eventPublisher.publishEvent(new ReputationUpdateEvent(req.toUserId(), ReputationUpdateEvent.Trigger.REVIEW_ADDED));
        certificateService.evaluateUserSkill(req.toUserId(), req.skillId());
        progressService.awardXp(fromUserId, "REVIEW_GIVEN", saved.getId(), 15, "Submitted useful session feedback.");
        progressService.awardXp(req.toUserId(), "REVIEW_RECEIVED", saved.getId(), Math.max(10, req.rating() * 4), "Received session feedback for " + skill.getName() + ".");

        return mapper.toReview(saved);
    }

    // helpers

    private User findUser(String id) {
        return userRepository.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("User not found: " + id));
    }
}
