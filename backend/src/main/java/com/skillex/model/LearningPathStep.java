package com.skillex.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "learning_path_steps")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LearningPathStep {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(length = 36, updatable = false, nullable = false)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "learning_path_id", nullable = false)
    private LearningPath learningPath;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "skill_id", nullable = false)
    private Skill skill;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "mentor_id", nullable = false)
    private User mentor;

    @Column(nullable = false)
    private int stepOrder; // 1, 2, 3, etc.

    @Column(nullable = false)
    private int estimatedHours;

    @Column(length = 500)
    private String description;

    @Column(nullable = false)
    @Builder.Default
    private boolean completed = false;

    @Column(name = "scheduled_session_at")
    private LocalDateTime scheduledSessionAt;

    @Column(name = "session_id")
    private String sessionId; // Link to actual Session if booked

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
