package com.skillex.service;

/**
 * Computes and persists reputation scores for platform users.
 *
 * <h3>Formula</h3>
 * <pre>
 *   skillexScore = (averageRating  × 50)
 *                + (sessionsCompleted × 5)
 *                + (reviewsReceived   × 10)
 *                + (communityActivity × 5)
 * </pre>
 *
 * <ul>
 *   <li>{@code averageRating} — the user's mean rating on a 0–5 scale</li>
 *   <li>{@code sessionsCompleted} — total sessions the user participated in</li>
 *   <li>{@code reviewsReceived} — total reviews written about the user</li>
 *   <li>{@code communityActivity} — combined post + discussion count authored</li>
 * </ul>
 *
 * @see com.skillex.service.impl.ReputationServiceImpl
 */
public interface ReputationService {

    /**
     * Compute (but do not persist) the current reputation score for {@code userId}.
     *
     * @param userId the target user's ID
     * @return computed integer score
     */
    int computeReputation(String userId);

    /**
     * Recompute and immediately persist the reputation score for {@code userId}
     * to {@code User.skillexScore}.
     *
     * @param userId the target user's ID
     */
    void refreshReputation(String userId);
}
