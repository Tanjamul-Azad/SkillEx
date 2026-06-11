package com.skillex.service;

import com.skillex.dto.search.SearchResultDto;
import java.util.List;

/**
 * Contract for unified semantic search across all indexable entities.
 *
 * <p>Performs embedding-based similarity matching to find semantically related
 * mentors, skills, discussions, and skill circles.
 *
 * <p>Results are ranked by relevance score (cosine similarity to query embedding).
 */
public interface UnifiedSearchService {

    /**
     * Execute semantic search query across all entities.
     *
     * @param query   free-text search query
     * @param limit   maximum number of results to return
     * @return mixed results sorted by relevance score (descending)
     */
    List<SearchResultDto> search(String query, int limit);

    /**
     * Execute semantic search and return results grouped by type.
     *
     * @param query   free-text search query
     * @param limit   maximum number of results per type
     * @return grouped results (mentors, skills, discussions, circles)
     */
    GroupedSearchResults searchGrouped(String query, int limit);

    /**
     * Container for grouped search results.
     */
    record GroupedSearchResults(
        List<SearchResultDto.MentorResult> mentors,
        List<SearchResultDto.SkillResult> skills,
        List<SearchResultDto.DiscussionResult> discussions,
        List<SearchResultDto.CircleResult> circles
    ) {}
}
