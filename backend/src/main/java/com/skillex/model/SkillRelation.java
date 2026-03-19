package com.skillex.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

/**
 * JPA entity for the {@code skill_relations} table.
 *
 * Encodes a directed similarity edge between two skills:
 * "skillId is similar to relatedSkillId with the given score".
 *
 * Rows are stored bidirectionally (A→B and B→A) so lookups in either
 * direction can be served by a single indexed query.
 *
 * <p>OOP notes:
 * <ul>
 *   <li>Uses a composite PK via {@link SkillRelationId} (embedded id class)</li>
 *   <li>Relationship to {@link Skill} is ManyToOne (no back-reference needed)</li>
 * </ul>
 */
@Entity
@Table(name = "skill_relations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SkillRelation {

    @EmbeddedId
    private SkillRelationId id;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("skillId")
    @JoinColumn(name = "skill_id", nullable = false)
    private Skill skill;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("relatedSkillId")
    @JoinColumn(name = "related_skill_id", nullable = false)
    private Skill relatedSkill;

    /**
     * Similarity score in [0.00, 1.00].
     * 1.0 = identical skill, 0.0 = no semantic overlap.
     */
    @Column(name = "similarity_score", nullable = false, precision = 3, scale = 2)
    private BigDecimal similarityScore;
}
