package com.skillex.service.reputation;

/**
 * Spring application event published whenever a user's reputation factors change.
 * The {@link com.skillex.service.impl.ReputationServiceImpl} listens for this event
 * and asynchronously recalculates + persists the updated {@code skillexScore}.
 *
 * <h3>Triggers</h3>
 * <ul>
 *   <li>{@link Trigger#SESSION_COMPLETED} — a session the user participated in was marked done</li>
 *   <li>{@link Trigger#REVIEW_ADDED} — the user received a new review</li>
 *   <li>{@link Trigger#COMMUNITY_INTERACTION} — the user published a post or started a discussion</li>
 * </ul>
 */
public record ReputationUpdateEvent(String userId, Trigger trigger) {

    public enum Trigger {
        SESSION_COMPLETED,
        REVIEW_ADDED,
        COMMUNITY_INTERACTION
    }
}
