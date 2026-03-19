package com.skillex.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * JPA entity mapping to the `skill_circles` table.
 *
 * OOP notes:
 *  - member_count is a denormalised count; updated atomically in service layer
 *  - activity is an enum from {VERY_ACTIVE, ACTIVE, QUIET}
 *  - members ManyToMany via skill_circle_members join table (V2 migration)
 *  - skills ManyToMany via skill_circle_skills join table (V2 migration)
 */
@Entity
@Table(name = "skill_circles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SkillCircle {

    @Id
    @Column(length = 36, updatable = false, nullable = false)
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(length = 50)
    @Builder.Default
    private String icon = "⚡";

    @Column(name = "member_count", nullable = false)
    @Builder.Default
    private Integer memberCount = 0;

    @Column(name = "last_session")
    private LocalDateTime lastSession;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 12)
    @Builder.Default
    private ActivityLevel activity = ActivityLevel.ACTIVE;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "skill_circle_members",
        joinColumns = @JoinColumn(name = "circle_id"),
        inverseJoinColumns = @JoinColumn(name = "user_id")
    )
    @Builder.Default
    private List<User> members = new ArrayList<>();

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "skill_circle_skills",
        joinColumns = @JoinColumn(name = "circle_id"),
        inverseJoinColumns = @JoinColumn(name = "skill_id")
    )
    @Builder.Default
    private List<Skill> skills = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    public enum ActivityLevel { VERY_ACTIVE, ACTIVE, QUIET }
}
