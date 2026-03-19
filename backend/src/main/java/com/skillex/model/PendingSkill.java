package com.skillex.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * Governance queue for unknown skills suggested by users/intents.
 */
@Entity
@Table(name = "pending_skills")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PendingSkill {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(length = 36, updatable = false, nullable = false)
    private String id;

    @Column(name = "normalized_name", nullable = false, unique = true, length = 150)
    private String normalizedName;

    @Column(name = "display_name", nullable = false, length = 150)
    private String displayName;

    @Column(length = 50)
    private String category;

    @Column(length = 500)
    private String description;

    @Column(name = "source_intent", columnDefinition = "TEXT")
    private String sourceIntent;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private Status status = Status.PENDING;

    @Column(name = "seen_count", nullable = false)
    @Builder.Default
    private int seenCount = 1;

    @Column(name = "confidence_sum", nullable = false)
    @Builder.Default
    private double confidenceSum = 0.0;

    @Column(name = "first_seen_at", nullable = false)
    @Builder.Default
    private LocalDateTime firstSeenAt = LocalDateTime.now();

    @Column(name = "last_seen_at", nullable = false)
    @Builder.Default
    private LocalDateTime lastSeenAt = LocalDateTime.now();

    @Column(name = "requested_by_user_id", length = 36)
    private String requestedByUserId;

    @Column(name = "promoted_skill_id", length = 36)
    private String promotedSkillId;

    @Column(name = "reviewed_by_user_id", length = 36)
    private String reviewedByUserId;

    @Column(name = "review_note", length = 500)
    private String reviewNote;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public enum Status { PENDING, APPROVED, REJECTED, AUTO_PROMOTED }
}
