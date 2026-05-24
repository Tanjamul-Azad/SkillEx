package com.skillex.controller;

import com.skillex.dto.common.ApiResponse;
import com.skillex.dto.common.PagedResponse;
import com.skillex.dto.skillcheck.CreateSkillCheckRequest;
import com.skillex.dto.skillcheck.SkillCheckFeedbackRequest;
import com.skillex.dto.skillcheck.SkillCheckMeetingDto;
import com.skillex.service.SkillCheckService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/skill-checks")
@RequiredArgsConstructor
public class SkillCheckController {
    private final SkillCheckService skillCheckService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<SkillCheckMeetingDto> create(Authentication auth, @Valid @RequestBody CreateSkillCheckRequest request) {
        return ApiResponse.created(skillCheckService.create(userId(auth), request));
    }

    @GetMapping
    public ApiResponse<PagedResponse<SkillCheckMeetingDto>> list(
        Authentication auth,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        return ApiResponse.ok(skillCheckService.listForUser(userId(auth), page, size));
    }

    @PostMapping("/{id}/feedback")
    public ApiResponse<SkillCheckMeetingDto> feedback(
        Authentication auth,
        @PathVariable String id,
        @Valid @RequestBody SkillCheckFeedbackRequest request
    ) {
        return ApiResponse.ok(skillCheckService.addFeedback(userId(auth), id, request));
    }

    private String userId(Authentication auth) {
        return (String) auth.getPrincipal();
    }
}
