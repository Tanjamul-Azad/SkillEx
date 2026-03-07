package com.skillex.controller;

import com.skillex.dto.common.ApiResponse;
import com.skillex.dto.user.MatchUserDto;
import com.skillex.service.MatchService;
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

    private String userId(Authentication auth) {
        return (String) auth.getPrincipal();
    }
}
