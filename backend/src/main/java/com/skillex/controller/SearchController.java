package com.skillex.controller;

import com.skillex.dto.search.SearchResultDto;
import com.skillex.dto.search.UnifiedSearchRequest;
import com.skillex.service.UnifiedSearchService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Global semantic search endpoint.
 *
 * <p>Provides unified search across mentors, skills, discussions, and skill circles
 * using embedding-based similarity matching.
 */
@RestController
@RequestMapping("/api/search")
@Slf4j
@RequiredArgsConstructor
public class SearchController {

    private final UnifiedSearchService unifiedSearchService;

    /**
     * Execute unified semantic search.
     *
     * @param query free-text search query
     * @param limit maximum number of results (capped at 50)
     * @return mixed results sorted by relevance score
     */
    @GetMapping
    public ResponseEntity<List<SearchResultDto>> search(
        @RequestParam String query,
        @RequestParam(defaultValue = "20") int limit
    ) {
        log.debug("[SearchController] Unified search for query: '{}' with limit: {}", query, limit);

        try {
            List<SearchResultDto> results = unifiedSearchService.search(query, limit);
            log.debug("[SearchController] Found {} results", results.size());
            return ResponseEntity.ok(results);
        } catch (Exception e) {
            log.error("[SearchController] Search failed for query: '{}'", query, e);
            return ResponseEntity.ok(List.of());
        }
    }

    /**
     * Execute grouped semantic search.
     *
     * @param query free-text search query
     * @param limit maximum number of results per category
     * @return grouped results (mentors, skills, discussions, circles)
     */
    @GetMapping("/grouped")
    public ResponseEntity<UnifiedSearchService.GroupedSearchResults> searchGrouped(
        @RequestParam String query,
        @RequestParam(defaultValue = "10") int limit
    ) {
        log.debug("[SearchController] Grouped search for query: '{}' with limit per category: {}", query, limit);

        try {
            UnifiedSearchService.GroupedSearchResults results = unifiedSearchService.searchGrouped(query, limit);
            log.debug("[SearchController] Found grouped results - mentors: {}, skills: {}, discussions: {}, circles: {}",
                results.mentors().size(), results.skills().size(), results.discussions().size(), results.circles().size());
            return ResponseEntity.ok(results);
        } catch (Exception e) {
            log.error("[SearchController] Grouped search failed for query: '{}'", query, e);
            return ResponseEntity.ok(new UnifiedSearchService.GroupedSearchResults(
                List.of(), List.of(), List.of(), List.of()
            ));
        }
    }
}
