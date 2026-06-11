package com.skillex.controller;

import com.skillex.dto.ai.SkillAssessmentDto;
import com.skillex.dto.common.ApiResponse;
import com.skillex.service.SkillAssessmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/ai/assessments")
@RequiredArgsConstructor
public class SkillAssessmentController {
    private final SkillAssessmentService assessmentService;

    @PostMapping("/generate")
    public ApiResponse<SkillAssessmentDto> generateAssessment(
        Authentication auth,
        @RequestParam String skillId,
        @RequestParam(defaultValue = "intermediate") String difficulty
    ) {
        String userId = (String) auth.getPrincipal();
        return ApiResponse.ok(assessmentService.generateAssessment(userId, skillId, difficulty));
    }

    @PostMapping("/{assessmentId}/submit")
    public ApiResponse<SkillAssessmentDto.GradedAssessment> submitAssessment(
        Authentication auth,
        @PathVariable String assessmentId,
        @RequestBody Map<String, String> answers
    ) {
        String userId = (String) auth.getPrincipal();
        return ApiResponse.ok(assessmentService.submitAnswers(userId, assessmentId, answers));
    }

    @GetMapping("/latest/{skillId}")
    public ApiResponse<SkillAssessmentDto.GradedAssessment> getLatestResult(
        Authentication auth,
        @PathVariable String skillId
    ) {
        String userId = (String) auth.getPrincipal();
        return ApiResponse.ok(assessmentService.getLatestResult(userId, skillId));
    }
}
