package com.skillex.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * A generated quiz attempt for one user + skill. The full question set —
 * including correct answers — is stored as JSON so grading happens
 * server-side against what was actually asked.
 */
@Entity
@Table(name = "skill_assessments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SkillAssessment {
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

    @Column(nullable = false, length = 20)
    private String difficulty;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "IN_PROGRESS"; // IN_PROGRESS, COMPLETED, EXPIRED

    /** JSON array of questions incl. correct answers — never sent raw to the client. */
    @Column(nullable = false, columnDefinition = "JSON")
    private String questions;

    private Integer score;

    @Column(name = "proficiency_level", length = 20)
    private String proficiencyLevel;

    @Column(columnDefinition = "TEXT")
    private String feedback;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
