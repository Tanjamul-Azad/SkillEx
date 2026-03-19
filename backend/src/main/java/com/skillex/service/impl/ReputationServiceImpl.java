package com.skillex.service.impl;

import com.skillex.model.User;
import com.skillex.repository.DiscussionRepository;
import com.skillex.repository.PostRepository;
import com.skillex.repository.ReviewRepository;
import com.skillex.repository.UserRepository;
import com.skillex.service.ReputationService;
import com.skillex.service.reputation.ReputationUpdateEvent;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;

/**
 * Observer-pattern implementation of {@link ReputationService}.
 *
 * <p>Listens for {@link ReputationUpdateEvent} via Spring's {@code @EventListener}
 * and recalculates + persists {@code User.skillexScore} using the reputation formula:
 *
 * <pre>
 *   skillexScore = (averageRating  × 50)
 *                + (sessionsCompleted × 5)
 *                + (reviewsReceived   × 10)
 *                + (communityActivity × 5)
 * </pre>
 *
 * Events are published by:
 * <ul>
 *   <li>{@link ReviewServiceImpl} — on review creation</li>
 *   <li>{@link SessionServiceImpl} — on session completion (both teacher & learner)</li>
 *   <li>{@link CommunityServiceImpl} — on post and discussion creation</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ReputationServiceImpl implements ReputationService {

    private final UserRepository       userRepository;
    private final ReviewRepository     reviewRepository;
    private final PostRepository       postRepository;
    private final DiscussionRepository discussionRepository;

    // ── Observer entry point ─────────────────────────────────────────────────

    /**
     * Spring event listener — fires synchronously within the publisher's transaction.
     * Any {@link ReputationUpdateEvent} causes a full score recalculation.
     */
    @EventListener
    @Transactional
    public void onReputationUpdate(ReputationUpdateEvent event) {
        log.debug("ReputationUpdateEvent received: userId={}, trigger={}", event.userId(), event.trigger());
        refreshReputation(event.userId());
    }

    // ── ReputationService API ────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public int computeReputation(String userId) {
        User user = fetchUser(userId);

        Double avgRating = reviewRepository.findAverageRatingByToUserId(userId);
        int sessionsCompleted = user.getSessionsCompleted() != null ? user.getSessionsCompleted() : 0;
        long reviewsReceived  = reviewRepository.countByToUserId(userId);
        long communityActivity = postRepository.countByAuthorId(userId)
                               + discussionRepository.countByAuthorId(userId);

        return (int) (
              ((avgRating != null ? avgRating : 0.0) * 50)
            + (sessionsCompleted * 5)
            + (reviewsReceived   * 10)
            + (communityActivity * 5)
        );
    }

    @Override
    @Transactional
    public void refreshReputation(String userId) {
        User user  = fetchUser(userId);
        int  score = computeReputation(userId);
        user.setSkillexScore(score);
        userRepository.save(user);
        log.debug("Reputation persisted for user {}: skillexScore={}", userId, score);
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    @SuppressWarnings("null")
    private User fetchUser(String id) {
        String safeId = Objects.requireNonNull(id, "userId must not be null");
        return userRepository.findById(safeId)
            .orElseThrow(() -> new EntityNotFoundException("User not found: " + id));
    }
}
