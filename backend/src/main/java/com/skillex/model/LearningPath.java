package com.skillex.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "learning_paths")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LearningPath {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(length = 36, updatable = false, nullable = false)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "goal_skill_id", nullable = false)
    private Skill goalSkill;

    @Column(nullable = false, length = 30)
    private String targetLevel; // beginner, intermediate, advanced, expert

    @Column(nullable = false)
    private int totalEstimatedHours;

    @Column(nullable = false)
    @Builder.Default
    private int completedSteps = 0;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "ACTIVE"; // ACTIVE, COMPLETED, PAUSED, CANCELLED

    @OneToMany(mappedBy = "learningPath", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<LearningPathStep> steps = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "estimated_completion_at")
    private LocalDateTime estimatedCompletionAt;

    public double getProgressPercent() {
        if (steps.isEmpty()) return 0;
        return (completedSteps * 100.0) / steps.size();
    }
}
