package com.skillex.service;

import java.util.Set;

/**
 * Contract for computing semantic similarity between skills.
 *
 * <p>Implementations may use a pre-built graph ({@code skill_relations} table),
 * an in-memory cache, or any future AI/embedding-backed approach — callers
 * are insulated from the source.
 *
 * <p>All methods are symmetry-aware: {@code isSimilar(A, B)} == {@code isSimilar(B, A)}.
 */
public interface SkillSimilarityService {

    /**
     * Pairwise similarity score between two skills.
     *
     * @param skillIdA first skill UUID (as String)
     * @param skillIdB second skill UUID (as String)
     * @return value in [0.0, 1.0]; 1.0 = identical, 0.0 = no relation in graph
     */
    double computeSimilarity(String skillIdA, String skillIdB);

    /**
     * Expand a set of skill IDs with semantically related skills above a threshold.
     *
     * <p>Used by {@link com.skillex.service.match.SmartMatchStrategy} to widen the
     * candidate pool beyond exact-skill matches.
     *
     * @param skillIds     seed set of skill IDs
     * @param minSimilarity minimum score to include a related skill (e.g. 0.60)
     * @return expanded set containing the originals plus any related skill IDs
     */
    Set<String> expandWithSimilar(Set<String> skillIds, double minSimilarity);
}
