package com.skillex.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * JPA entity mapping to the `sessions` table.
 *
 * OOP notes:
 *  - Linked to an Exchange (the accepted deal that spawned this session)
 *  - teacher_id / learner_id are direct User FKs for fast query access
 *  - status transitions: PROPOSED → SCHEDULED → IN_PROGRESS → COMPLETED | CANCELLED
 *  - proposedBy tracks who proposed the current time slot
 *  - sessionType determines video vs audio-only call
 */
@Entity
@Table(name = "sessions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Session {

    @Id
    @Column(length = 36, updatable = false, nullable = false)
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "exchange_id", nullable = false)
    private Exchange exchange;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "teacher_id", nullable = false)
    private User teacher;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "learner_id", nullable = false)
    private User learner;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "skill_id", nullable = false)
    private Skill skill;

    /** Who proposed the current time slot (so the OTHER party can accept/reschedule) */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "proposed_by")
    private User proposedBy;

    @Column(name = "scheduled_at", nullable = false)
    private LocalDateTime scheduledAt;

    @Column(name = "duration_mins", nullable = false)
    @Builder.Default
    private Integer durationMins = 60;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 15)
    @Builder.Default
    private SessionStatus status = SessionStatus.PROPOSED;

    @Enumerated(EnumType.STRING)
    @Column(name = "session_type", nullable = false, length = 10)
    @Builder.Default
    private MeetingType sessionType = MeetingType.VIDEO;

    @Column(name = "meet_link", length = 500)
    private String meetLink;

    @Column(name = "shared_notes", columnDefinition = "TEXT")
    private String sharedNotes;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum SessionStatus { PROPOSED, SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED }

    public enum MeetingType { VIDEO, AUDIO }
}
