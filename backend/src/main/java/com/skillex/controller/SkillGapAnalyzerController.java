package com.skillex.controller;

import com.skillex.dto.ai.SkillGapAnalysisDto;
import com.skillex.dto.common.ApiResponse;
import com.skillex.service.SkillGapAnalyzerService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/ai/skill-gap")
@RequiredArgsConstructor
public class SkillGapAnalyzerController {
    private final SkillGapAnalyzerService skillGapAnalyzerService;

    @GetMapping("/{goalSkillId}")
    public ApiResponse<SkillGapAnalysisDto> analyze(
        Authentication auth,
        @PathVariable String goalSkillId
    ) {
        String userId = (String) auth.getPrincipal();
        return ApiResponse.ok(skillGapAnalyzerService.analyzeGap(userId, goalSkillId));
    }
}
