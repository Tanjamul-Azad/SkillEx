package com.skillex.controller;

import com.skillex.dto.common.ApiResponse;
import com.skillex.dto.user.MatchUserDto;
import com.skillex.service.MatchService;
import com.skillex.service.match.graph.ExchangeChain;
import com.skillex.service.match.graph.ExchangeCycle;
import com.skillex.service.match.graph.ScoredCycle;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for the skill-match algorithm.
 * Base path: /api/match
 */
@RestController
@RequestMapping("/api/match")
@RequiredArgsConstructor
public class MatchController {

    private final MatchService matchService;

    /** GET /api/match/users?limit=20 — ranked compatible users */
    @GetMapping("/users")
    public ResponseEntity<ApiResponse<List<MatchUserDto>>> findMatches(
        Authentication auth,
        @RequestParam(defaultValue = "20") int limit
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            matchService.findMatches(userId(auth), limit)));
    }

    /**
     * GET /api/match/chains — Phase 4: raw skill-ID chains (backtracking DFS)
     *
     * <p>Returns circular exchange chains involving the authenticated user.
     * Skill IDs are unresolved; use {@code /cycles} for fully enriched results.
     */
    @GetMapping("/chains")
    public ResponseEntity<ApiResponse<List<ExchangeChain>>> findChains(Authentication auth) {
        return ResponseEntity.ok(ApiResponse.ok(
            matchService.findChains(userId(auth))));
    }

    /**
     * GET /api/match/cycles — Step 7: enriched exchange cycles (three-colour DFS)
     *
     * <p>Returns directed exchange cycles involving the authenticated user,
     * detected via classic DFS with WHITE/GRAY/BLACK node colouring.
     * Every hop in the response carries resolved user names and skill names —
     * ready to render without a second lookup.
     *
     * <p>Example response element:
     * <pre>
     * {
     *   "userIds":   ["uuid-alice", "uuid-bob", "uuid-carol"],
     *   "userNames": ["Alice", "Bob", "Carol"],
     *   "hops": [
     *     { "fromUserName": "Alice", "toUserName": "Bob",   "primarySkillName": "Python",     ... },
     *     { "fromUserName": "Bob",   "toUserName": "Carol", "primarySkillName": "UI Design",  ... },
     *     { "fromUserName": "Carol", "toUserName": "Alice", "primarySkillName": "Marketing",  ... }
     *   ],
     *   "length": 3
     * }
     * </pre>
     */
    @GetMapping("/cycles")
    public ResponseEntity<ApiResponse<List<ExchangeCycle>>> findCycles(Authentication auth) {
        return ResponseEntity.ok(ApiResponse.ok(
            matchService.findCycles(userId(auth))));
    }

    /**
     * GET /api/match/top-cycles?limit=5 — Step 8: top-ranked exchange cycles
     *
     * <p>Finds all exchange cycles involving the authenticated user, scores each
     * using the CycleScore formula, and returns the top {@code limit} results
     * ordered by score descending.
     *
     * <h3>Formula</h3>
     * <pre>
     *   CycleScore = (averageRating × 40) + (skillMatchQuality × 35) + (sessionAvailability × 25)
     * </pre>
     *
     * <p>Each {@link ScoredCycle} exposes the cycle itself plus the three
     * normalised sub-scores for transparent display on the frontend.
     *
     * <p>Example response element:
     * <pre>
     * {
     *   "score": 87,
     *   "averageRating": 0.90,
     *   "skillMatchQuality": 0.83,
     *   "sessionAvailability": 0.75,
     *   "cycle": {
     *     "userNames": ["Alice", "Bob", "Carol"],
     *     "hops": [
     *       { "fromUserName": "Alice", "primarySkillName": "Python",    "toUserName": "Bob"   },
     *       { "fromUserName": "Bob",   "primarySkillName": "UI Design", "toUserName": "Carol" },
     *       { "fromUserName": "Carol", "primarySkillName": "Marketing", "toUserName": "Alice" }
     *     ]
     *   }
     * }
     * </pre>
     */
    @GetMapping("/top-cycles")
    public ResponseEntity<ApiResponse<List<ScoredCycle>>> findTopCycles(
        Authentication auth,
        @RequestParam(defaultValue = "20") int limit
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            matchService.findTopCycles(userId(auth), limit)));
    }

    private String userId(Authentication auth) {
        return (String) auth.getPrincipal();
    }
}
