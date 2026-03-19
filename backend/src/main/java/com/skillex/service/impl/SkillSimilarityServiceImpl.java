package com.skillex.service.impl;

import com.skillex.model.SkillRelation;
import com.skillex.repository.SkillRelationRepository;
import com.skillex.service.SkillSimilarityService;
import com.skillex.service.embedding.SkillEmbeddingSyncService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * Graph-backed implementation of {@link SkillSimilarityService}.
 *
 * <p>Uses the {@code skill_relations} table as a pre-built similarity graph.
 * Rows are stored bidirectionally, so a single directional lookup is sufficient.
 *
 * <h3>How similarity is resolved</h3>
 * <ol>
 *   <li>Exact match (same ID) → 1.0 immediately, no DB hit</li>
 *   <li>Direct edge A→B in {@code skill_relations} → stored score</li>
 *   <li>Reverse edge B→A (bidirectional storage) → same score</li>
 *   <li>No edge found → 0.0 (no semantic relation recorded)</li>
 * </ol>
 *
 * <h3>OOP notes</h3>
 * <ul>
 *   <li>Single Responsibility: only similarity logic — no match ranking here</li>
 *   <li>Dependency Inversion: depends on {@link SkillRelationRepository} abstraction</li>
 *   <li>Open/Closed: swap the implementation (e.g. embedding model) without
 *       touching callers — they depend only on the {@link SkillSimilarityService} interface</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
public class SkillSimilarityServiceImpl implements SkillSimilarityService {

    /** Minimum similarity to treat two skills as meaningfully related. */
    private static final double SIMILARITY_FLOOR = 0.0;

    private final SkillRelationRepository skillRelationRepository;
    private final SkillEmbeddingSyncService skillEmbeddingSyncService;

    // ── Interface implementation ──────────────────────────────────────────────

    /**
     * {@inheritDoc}
     *
     * <p>Performance: at most two indexed single-row lookups per invocation.
     * Both lookups hit the composite PK index ({@code skill_id, related_skill_id}).
     */
    @Override
    @Transactional(readOnly = true)
    public double computeSimilarity(String skillIdA, String skillIdB) {
        if (skillIdA == null || skillIdB == null) return SIMILARITY_FLOOR;
        if (skillIdA.equals(skillIdB))            return 1.0;

        Map<String, double[]> embeddings = skillEmbeddingSyncService.loadEmbeddingMap();
        double embeddingScore = cosineSimilarity(
            embeddings.get(skillIdA),
            embeddings.get(skillIdB)
        );

        double relationScore = relationSimilarity(skillIdA, skillIdB);

        // Prefer the strongest semantic signal. Curated graph edges remain valuable,
        // while embeddings generalise beyond manually-seeded relationships.
        return Math.max(embeddingScore, relationScore);
    }

    private double relationSimilarity(String skillIdA, String skillIdB) {
        if (skillIdA.equals(skillIdB)) return 1.0;

        // Try direct edge A → B
        Optional<SkillRelation> edge = skillRelationRepository.findRelation(skillIdA, skillIdB);
        if (edge.isPresent()) {
            return edge.get().getSimilarityScore().doubleValue();
        }

        // Try reverse edge B → A (graph is stored bidirectionally, but belt-and-suspenders)
        Optional<SkillRelation> reverseEdge = skillRelationRepository.findRelation(skillIdB, skillIdA);
        return reverseEdge
            .map(r -> r.getSimilarityScore().doubleValue())
            .orElse(SIMILARITY_FLOOR);
    }

    /**
     * {@inheritDoc}
     *
     * <p>For each seed skill, fetches all edges with score >= {@code minSimilarity}
     * and adds the related skill IDs to the returned set.
     */
    @Override
    @Transactional(readOnly = true)
    public Set<String> expandWithSimilar(Set<String> skillIds, double minSimilarity) {
        Set<String> expanded = new HashSet<>(skillIds);
        Map<String, double[]> embeddings = skillEmbeddingSyncService.loadEmbeddingMap();

        BigDecimal threshold = BigDecimal.valueOf(minSimilarity);
        for (String skillId : skillIds) {
            List<SkillRelation> related =
                skillRelationRepository.findRelatedAboveThreshold(skillId, threshold);
            for (SkillRelation rel : related) {
                expanded.add(rel.getId().getRelatedSkillId());
            }

            double[] source = embeddings.get(skillId);
            if (source == null) continue;

            embeddings.entrySet().stream()
                .filter(entry -> !skillId.equals(entry.getKey()))
                .map(entry -> Map.entry(entry.getKey(), cosineSimilarity(source, entry.getValue())))
                .filter(entry -> entry.getValue() >= minSimilarity)
                .sorted(Map.Entry.<String, Double>comparingByValue(Comparator.reverseOrder()))
                .limit(4)
                .forEach(entry -> expanded.add(entry.getKey()));
        }
        return expanded;
    }

    private double cosineSimilarity(double[] left, double[] right) {
        if (left == null || right == null || left.length == 0 || right.length == 0 || left.length != right.length) {
            return SIMILARITY_FLOOR;
        }

        double dot = 0.0;
        double leftNorm = 0.0;
        double rightNorm = 0.0;
        for (int i = 0; i < left.length; i++) {
            dot += left[i] * right[i];
            leftNorm += left[i] * left[i];
            rightNorm += right[i] * right[i];
        }

        if (leftNorm == 0.0 || rightNorm == 0.0) {
            return SIMILARITY_FLOOR;
        }

        double cosine = dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
        return Math.max(0.0, Math.min(1.0, cosine));
    }
}
