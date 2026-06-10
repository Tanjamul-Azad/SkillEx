package com.skillex.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * JPA entity for AI Tutor Bot conversations.
 * Stores conversation history and quiz performance per skill.
 */
@Entity
@Table(name = "tutor_bot_conversations", indexes = {
    @Index(name = "idx_user_skill", columnList = "user_id,skill_id", unique = true),
    @Index(name = "idx_user_id", columnList = "user_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TutorBotConversation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(length = 36, updatable = false, nullable = false)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "skill_id", nullable = false)
    private Skill skill;

    /**
     * Full message history as JSON (array of messages).
     * Each message is: { id, content, role, createdAt, metadata? }
     */
    @Column(columnDefinition = "LONGTEXT", nullable = false)
    private String messagesJson;

    /**
     * Total number of quiz questions asked in this conversation
     */
    @Column(name = "total_questions_asked", nullable = false)
    @Builder.Default
    private Integer totalQuestionsAsked = 0;

    /**
     * Number of questions answered correctly
     */
    @Column(name = "questions_answered_correctly", nullable = false)
    @Builder.Default
    private Integer questionsAnsweredCorrectly = 0;

    /**
     * Accuracy percentage (0.0-100.0)
     */
    @Column(name = "accuracy_percentage")
    private Double accuracyPercentage;

    /**
     * Whether this conversation is currently active
     */
    @Column(nullable = false)
    @Builder.Default
    private Boolean active = true;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "last_interaction_at")
    private LocalDateTime lastInteractionAt;

    /**
     * Calculate accuracy percentage
     */
    public void recalculateAccuracy() {
        if (totalQuestionsAsked > 0) {
            this.accuracyPercentage = (questionsAnsweredCorrectly.doubleValue() / totalQuestionsAsked) * 100.0;
        } else {
            this.accuracyPercentage = 0.0;
        }
    }

    /**
     * Record a quiz question attempt
     */
    public void recordQuizAttempt(boolean correct) {
        this.totalQuestionsAsked++;
        if (correct) {
            this.questionsAnsweredCorrectly++;
        }
        recalculateAccuracy();
    }

    /**
     * Check if conversation is stale (no interaction in last N hours)
     */
    public boolean isStale(int hoursThreshold) {
        if (lastInteractionAt == null) {
            return true;
        }
        LocalDateTime staleThreshold = LocalDateTime.now().minusHours(hoursThreshold);
        return lastInteractionAt.isBefore(staleThreshold);
    }
}
