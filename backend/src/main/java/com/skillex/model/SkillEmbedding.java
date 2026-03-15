package com.skillex.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Stored embedding vector for a skill.
 *
 * <p>We persist one active vector per skill so cosine similarity can be computed
 * cheaply during matching without calling an external model on every request.
 */
@Entity
@Table(name = "skill_embeddings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SkillEmbedding {

    @Id
    @Column(name = "skill_id", length = 36, nullable = false)
    private String skillId;

    @Column(name = "model_name", nullable = false, length = 100)
    private String modelName;

    @Column(name = "dimensions", nullable = false)
    private int dimensions;

    @Column(name = "vector_json", nullable = false, columnDefinition = "LONGTEXT")
    private String vectorJson;

    @Column(name = "source_text", nullable = false, length = 1000)
    private String sourceText;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
