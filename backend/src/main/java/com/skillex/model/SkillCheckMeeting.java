package com.skillex.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "skill_check_meetings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SkillCheckMeeting {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(length = 36, updatable = false, nullable = false)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "requester_id", nullable = false)
    private User requester;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "target_user_id", nullable = false)
    private User targetUser;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "skill_id", nullable = false)
    private Skill skill;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private SkillCheckStatus status = SkillCheckStatus.REQUESTED;

    @Column(name = "checklist_intro", nullable = false)
    @Builder.Default
    private Boolean checklistIntro = false;

    @Column(name = "checklist_demo", nullable = false)
    @Builder.Default
    private Boolean checklistDemo = false;

    @Column(name = "checklist_goal_alignment", nullable = false)
    @Builder.Default
    private Boolean checklistGoalAlignment = false;

    @Column(name = "checklist_schedule_fit", nullable = false)
    @Builder.Default
    private Boolean checklistScheduleFit = false;

    @Column(length = 1000)
    private String message;

    @Column(name = "scheduled_at")
    private LocalDateTime scheduledAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum SkillCheckStatus { REQUESTED, ACCEPTED, COMPLETED, DECLINED, CANCELLED }
}
