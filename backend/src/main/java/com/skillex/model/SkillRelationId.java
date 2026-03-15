package com.skillex.model;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.*;

import java.io.Serializable;

/**
 * Composite primary key for {@link SkillRelation}.
 *
 * Must implement {@link Serializable} and override {@code equals}/{@code hashCode}
 * as required by the JPA spec for embedded IDs — Lombok's {@code @EqualsAndHashCode}
 * handles this.
 */
@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class SkillRelationId implements Serializable {

    @Column(name = "skill_id", length = 36)
    private String skillId;

    @Column(name = "related_skill_id", length = 36)
    private String relatedSkillId;
}
