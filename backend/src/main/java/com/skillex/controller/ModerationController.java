package com.skillex.controller;

import com.skillex.dto.common.ApiResponse;
import com.skillex.dto.common.PagedResponse;
import com.skillex.dto.moderation.*;
import com.skillex.service.ModerationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/moderation")
@RequiredArgsConstructor
public class ModerationController {
    private final ModerationService moderationService;

    @PostMapping("/reports")
    public ResponseEntity<ApiResponse<ReportDto>> createReport(
        Authentication auth,
        @Valid @RequestBody CreateReportRequest req
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.ok(moderationService.createReport(userId(auth), req)));
    }

    @GetMapping("/reports")
    public ResponseEntity<ApiResponse<PagedResponse<ReportDto>>> reports(
        Authentication auth,
        @RequestParam(required = false) String status,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        ensureAdmin(auth);
        return ResponseEntity.ok(ApiResponse.ok(moderationService.listReports(status, page, size)));
    }

    @GetMapping("/cases")
    public ResponseEntity<ApiResponse<PagedResponse<ModerationCaseDto>>> cases(
        Authentication auth,
        @RequestParam(required = false) String status,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        ensureAdmin(auth);
        return ResponseEntity.ok(ApiResponse.ok(moderationService.listCases(status, page, size)));
    }

    @GetMapping("/cases/{caseId}")
    public ResponseEntity<ApiResponse<ModerationCaseDto>> getCase(Authentication auth, @PathVariable String caseId) {
        ensureAdmin(auth);
        return ResponseEntity.ok(ApiResponse.ok(moderationService.getCase(caseId)));
    }

    @PostMapping("/actions")
    public ResponseEntity<ApiResponse<ModerationActionDto>> applyAction(
        Authentication auth,
        @Valid @RequestBody CreateModerationActionRequest req
    ) {
        ensureAdmin(auth);
        return ResponseEntity.ok(ApiResponse.ok(moderationService.applyAction(userId(auth), req)));
    }

    @GetMapping("/users/{userId}/actions")
    public ResponseEntity<ApiResponse<PagedResponse<ModerationActionDto>>> userActions(
        Authentication auth,
        @PathVariable String userId,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        ensureAdmin(auth);
        return ResponseEntity.ok(ApiResponse.ok(moderationService.listUserActions(userId, page, size)));
    }

    private String userId(Authentication auth) {
        return (String) auth.getPrincipal();
    }

    private void ensureAdmin(Authentication auth) {
        boolean isAdmin = auth != null && auth.getAuthorities().stream()
            .map(GrantedAuthority::getAuthority)
            .anyMatch("ROLE_ADMIN"::equals);
        if (!isAdmin) throw new AccessDeniedException("Admin role required");
    }
}
