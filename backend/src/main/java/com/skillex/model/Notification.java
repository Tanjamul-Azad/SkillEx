package com.skillex.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * JPA entity mapping to the `notifications` table.
 *
 * OOP notes:
 *  - user (recipient) and fromUser (optional sender) are separate FK relationships
 *  - type ENUM controls which icon/copy is rendered on frontend
 *  - SYSTEM_UPDATE type has no fromUser (system-generated)
 */
@Entity
@Table(name = "notifications")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notification {

    @Id
    @Column(length = 36, updatable = false, nullable = false)
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 25)
    private NotificationType type;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;

    @Column(name = "target_type", length = 40)
    private String targetType;

    @Column(name = "target_id", length = 36)
    private String targetId;

    @Column(name = "action_url", length = 500)
    private String actionUrl;

    // Optional — null for system-generated notifications
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "from_user_id")
    private User fromUser;

    @Column(name = "is_read", nullable = false)
    @Builder.Default
    private Boolean isRead = false;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    public enum NotificationType {
        MATCH_REQUEST,
        CONNECTION_REQUEST,
        CONNECTION_ACCEPTED,
        SESSION_SCHEDULED,
        REVIEW_LEFT,
        COMMUNITY_EVENT,
        CIRCLE_ACTIVITY,
        DISCUSSION_REPLY,
        SYSTEM_UPDATE
    }
}
