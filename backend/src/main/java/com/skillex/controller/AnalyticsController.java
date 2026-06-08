package com.skillex.controller;

import com.skillex.dto.analytics.ImpactStatsDto;
import com.skillex.dto.analytics.PlatformAnalyticsDto;
import com.skillex.dto.common.ApiResponse;
import com.skillex.service.AnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/analytics")
@RequiredArgsConstructor
public class AnalyticsController {
    private final AnalyticsService analyticsService;

    @GetMapping("/platform")
    public ResponseEntity<ApiResponse<PlatformAnalyticsDto>> platform(
        @RequestParam(defaultValue = "5") int limit
    ) {
        return ResponseEntity.ok(ApiResponse.ok(analyticsService.getPlatformAnalytics(limit)));
    }

    /**
     * Public "economy at a glance" impact snapshot. No auth required so it can drive a
     * marketing/impact page and be shown to anyone (judges, visitors).
     */
    @GetMapping("/impact")
    public ResponseEntity<ApiResponse<ImpactStatsDto>> impact(
        @RequestParam(defaultValue = "6") int topSkills
    ) {
        return ResponseEntity.ok(ApiResponse.ok(analyticsService.getImpactStats(topSkills)));
    }
}
