package com.skillex.controller;

import com.skillex.dto.common.ApiResponse;
import com.skillex.dto.common.PagedResponse;
import com.skillex.dto.progress.UserProgressDto;
import com.skillex.dto.progress.XpEventDto;
import com.skillex.service.ProgressService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class ProgressController {

    private final ProgressService progressService;

    @GetMapping("/api/progress/me")
    public ResponseEntity<ApiResponse<UserProgressDto>> myProgress(Authentication auth) {
        return ResponseEntity.ok(ApiResponse.ok(progressService.getProgress(userId(auth))));
    }

    @GetMapping("/api/users/{userId}/progress")
    public ResponseEntity<ApiResponse<UserProgressDto>> userProgress(@PathVariable String userId) {
        return ResponseEntity.ok(ApiResponse.ok(progressService.getProgress(userId)));
    }

    @GetMapping("/api/progress/me/xp-events")
    public ResponseEntity<ApiResponse<PagedResponse<XpEventDto>>> myXpEvents(
        Authentication auth,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        return ResponseEntity.ok(ApiResponse.ok(progressService.getXpEvents(userId(auth), page, size)));
    }

    private String userId(Authentication auth) {
        return (String) auth.getPrincipal();
    }
}
