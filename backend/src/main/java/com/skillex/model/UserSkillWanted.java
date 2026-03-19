package com.skillex.model;

import jakarta.persistence.*;
import lombok.*;

import java.io.Serializable;

/**
 * Junction entity for the `user_skills_wanted` table.
 *
 * Mirror of UserSkillOffered — maps the `level` column indicating how advanced
 * a skill the user wants to learn (their target proficiency).
 */
@Entity
@Table(name = "user_skills_wanted")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserSkillWanted {

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
    private UserSkillOffered.SkillProficiency level = UserSkillOffered.SkillProficiency.BEGINNER;

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
}
