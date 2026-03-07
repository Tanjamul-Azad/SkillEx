package com.skillex.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * JPA entity mapping to the `exchanges` table.
 *
 * OOP notes:
 *  - FK column is `receiver_id` (not provider_id) — aligned with DB schema
 *  - ExchangeStatus enum values must match DB ENUM entries exactly (EnumType.STRING)
 *  - `session_date` captures the agreed session datetime once exchange is accepted
 */
@Entity
@Table(name = "exchanges")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Exchange {

    @Id
    @Column(length = 36, updatable = false, nullable = false)
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    // User who initiated the exchange request
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "requester_id", nullable = false)
    private User requester;

    // User who received the exchange request — DB column is receiver_id
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "receiver_id", nullable = false)
    private User receiver;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "offered_skill_id")
    private Skill offeredSkill;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "wanted_skill_id")
    private Skill wantedSkill;

    @Column(columnDefinition = "TEXT")
    private String message;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    @Builder.Default
    private ExchangeStatus status = ExchangeStatus.PENDING;

    // Agreed session datetime, populated when exchange is accepted
    @Column(name = "session_date")
    private LocalDateTime sessionDate;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // Enum names must match DB ENUM values exactly (DECLINED not REJECTED)
    public enum ExchangeStatus { PENDING, ACCEPTED, DECLINED, COMPLETED, CANCELLED }
}
