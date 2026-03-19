package com.skillex.model;

import jakarta.persistence.*;
import lombok.*;

import java.io.Serializable;

/**
 * Junction entity for the `user_skills_offered` table.
 *
 * OOP notes:
 *  - Replaces the plain @ManyToMany join so we can map the extra `level` column
 *  - Uses @EmbeddedId (composite key = user_id + skill_id) per JPA best practice
 *  - Skill proficiency level: BEGINNER / MODERATE / EXPERT stored as string in DB ENUM
 */
@Entity
@Table(name = "user_skills_offered")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserSkillOffered {

    @EmbeddedId
    private UserSkillId id;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("userId")
    @JoinColumn(name = "user_id", insertable = false, updatable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("skillId")
    @JoinColumn(name = "skill_id", insertable = false, updatable = false)
    private Skill skill;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    @Builder.Default
    private SkillProficiency level = SkillProficiency.BEGINNER;

    // ── Embedded composite key ────────────────────────────────────────────────
    @Embeddable
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @EqualsAndHashCode
    public static class UserSkillId implements Serializable {
        @Column(name = "user_id", length = 36)
        private String userId;

        @Column(name = "skill_id", length = 36)
        private String skillId;
    }

    // Values must match DB ENUM('BEGINNER','MODERATE','EXPERT')
    public enum SkillProficiency { BEGINNER, MODERATE, EXPERT }
}
