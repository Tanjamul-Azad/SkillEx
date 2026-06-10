package com.skillex.controller;

import com.skillex.dto.ai.LearningPathDto;
import com.skillex.dto.common.ApiResponse;
import com.skillex.service.LearningPathService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/ai/learning-paths")
@RequiredArgsConstructor
public class LearningPathController {
    private final LearningPathService learningPathService;

    @PostMapping
    public ApiResponse<LearningPathDto> generate(
        Authentication auth,
        @RequestParam String goalSkillId,
        @RequestParam(defaultValue = "intermediate") String targetLevel
    ) {
        String userId = (String) auth.getPrincipal();
        return ApiResponse.created(learningPathService.generateAndSchedulePath(userId, goalSkillId, targetLevel));
    }

    @GetMapping
    public ApiResponse<List<LearningPathDto>> list(Authentication auth) {
        String userId = (String) auth.getPrincipal();
        return ApiResponse.ok(learningPathService.listUserPaths(userId));
    }

    @PostMapping("/{pathId}/steps/{stepOrder}/complete")
    public ApiResponse<Void> completeStep(
        Authentication auth,
        @PathVariable String pathId,
        @PathVariable int stepOrder
    ) {
        learningPathService.completeStep(pathId, stepOrder);
        return ApiResponse.ok(null);
    }

    @DeleteMapping("/{pathId}")
    public ApiResponse<Void> cancel(
        Authentication auth,
        @PathVariable String pathId
    ) {
        learningPathService.cancelPath(pathId);
        return ApiResponse.ok(null);
    }
}
