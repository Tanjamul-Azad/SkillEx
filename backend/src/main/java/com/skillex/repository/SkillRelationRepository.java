package com.skillex.repository;

import com.skillex.model.SkillRelation;
import com.skillex.model.SkillRelationId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository for {@link SkillRelation} — the skill similarity graph edges.
 */
@Repository
public interface SkillRelationRepository extends JpaRepository<SkillRelation, SkillRelationId> {

    /**
     * Look up the similarity edge between two specific skills (directional).
     * Returns empty if no edge was seeded for this pair.
     */
    @Query("""
        SELECT sr FROM SkillRelation sr
        WHERE sr.id.skillId = :skillId
          AND sr.id.relatedSkillId = :relatedSkillId
        """)
    Optional<SkillRelation> findRelation(
        @Param("skillId")        String skillId,
        @Param("relatedSkillId") String relatedSkillId);

    /**
     * Fetch all skills similar to {@code skillId} above a threshold score.
     * Useful for expanding a user's skill set when building the match candidate pool.
     */
    @Query("""
        SELECT sr FROM SkillRelation sr
        WHERE sr.id.skillId = :skillId
          AND sr.similarityScore >= :minScore
        ORDER BY sr.similarityScore DESC
        """)
    List<SkillRelation> findRelatedAboveThreshold(
        @Param("skillId")  String skillId,
        @Param("minScore") java.math.BigDecimal minScore);
}
