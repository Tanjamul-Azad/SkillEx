package com.skillex.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * JPA entity mapping to the `users` table.
 *
 * OOP notes:
 *  - Encapsulates all user state; password hash is never serialised to JSON (@JsonIgnore)
 *  - Enum types kept in sync with MySQL ENUM column values (EnumType.STRING stores name())
 *  - Skill relationships kept as @ManyToMany for read access; junction entities added in Phase 3
 *    to expose the per-skill proficiency level column.
 */
@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @Column(name = "id", length = 36, updatable = false, nullable = false)
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, unique = true, length = 255)
    private String email;

    @JsonIgnore
    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(length = 200)
    private String university;

    // DB column is `avatar` (not avatar_url)
    @Column(name = "avatar", length = 500)
    private String avatar;

    @Column(columnDefinition = "TEXT")
    private String bio;

    @Column(name = "teach_intent_text", columnDefinition = "TEXT")
    private String teachIntentText;

    @Column(name = "learn_intent_text", columnDefinition = "TEXT")
    private String learnIntentText;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    @Builder.Default
    private UserRole role = UserRole.STUDENT;

    // Maps to `level` ENUM column — values must match DB ENUM entries exactly
    @Enumerated(EnumType.STRING)
    @Column(name = "level", nullable = false, length = 15)
    @Builder.Default
    private UserLevel level = UserLevel.NEWCOMER;

    @Column(name = "skillex_score", nullable = false)
    @Builder.Default
    private Integer skillexScore = 0;

    @Column(name = "sessions_completed", nullable = false)
    @Builder.Default
    private Integer sessionsCompleted = 0;

    @Column(name = "rating", precision = 3, scale = 2, nullable = false)
    @Builder.Default
    private BigDecimal rating = BigDecimal.ZERO;

    @Column(name = "is_online", nullable = false)
    @Builder.Default
    private Boolean isOnline = false;

    // DB column is `joined_at` (not created_at)
    @CreationTimestamp
    @Column(name = "joined_at", updatable = false)
    private LocalDateTime joinedAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // ── Relationships ────────────────────────────────────────────────────────
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "user_skills_offered",
        joinColumns = @JoinColumn(name = "user_id"),
        inverseJoinColumns = @JoinColumn(name = "skill_id")
    )
    @Builder.Default
    private List<Skill> skillsOffered = new ArrayList<>();

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "user_skills_wanted",
        joinColumns = @JoinColumn(name = "user_id"),
        inverseJoinColumns = @JoinColumn(name = "skill_id")
    )
    @Builder.Default
    private List<Skill> skillsWanted = new ArrayList<>();

    // ── Enums (names stored verbatim by EnumType.STRING — must match DB ENUM values) ──
    public enum UserRole    { STUDENT, ADMIN }
    public enum UserLevel   { NEWCOMER, LEARNER, PRACTITIONER, SKILLED, ADVANCED, MASTER }
}
