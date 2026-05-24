package com.skillex.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_restrictions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserRestriction {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(length = 36, updatable = false, nullable = false)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "action_id")
    private ModerationAction action;

    @Enumerated(EnumType.STRING)
    @Column(name = "restriction_type", nullable = false, length = 40)
    private RestrictionType restrictionType;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private RestrictionStatus status = RestrictionStatus.ACTIVE;

    @Column(name = "starts_at", nullable = false)
    private LocalDateTime startsAt;

    @Column(name = "ends_at")
    private LocalDateTime endsAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    public enum RestrictionType {
        WARN,
        RESTRICT_POSTING,
        RESTRICT_MESSAGING,
        SUSPEND_ACCOUNT,
        BAN_ACCOUNT
    }

    public enum RestrictionStatus {
        ACTIVE,
        EXPIRED,
        REVOKED
    }
}
