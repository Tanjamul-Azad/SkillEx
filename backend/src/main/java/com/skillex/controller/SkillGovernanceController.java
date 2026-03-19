package com.skillex.controller;

import com.skillex.dto.common.ApiResponse;
import com.skillex.dto.skill.ApprovePendingSkillRequest;
import com.skillex.dto.skill.RejectPendingSkillRequest;
import com.skillex.model.PendingSkill;
import com.skillex.model.Skill;
import com.skillex.service.SkillCatalogGovernanceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Admin governance endpoints for pending skill intake pipeline.
 */
@RestController
@RequestMapping("/api/skills/pending")
@RequiredArgsConstructor
public class SkillGovernanceController {

    private final SkillCatalogGovernanceService governanceService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<PendingSkill>>> list(
        Authentication auth,
        @RequestParam(required = false) String status,
        @RequestParam(required = false) Integer limit
    ) {
        ensureAdmin(auth);
        return ResponseEntity.ok(ApiResponse.ok(governanceService.listPending(status, limit)));
    }

    @PostMapping("/{pendingId}/approve")
    public ResponseEntity<ApiResponse<Skill>> approve(
        Authentication auth,
        @PathVariable String pendingId,
        @Valid @RequestBody(required = false) ApprovePendingSkillRequest req
    ) {
        ensureAdmin(auth);
        ApprovePendingSkillRequest body = req == null
            ? new ApprovePendingSkillRequest(null, null, null, null)
            : req;
        return ResponseEntity.ok(ApiResponse.ok(
            governanceService.approve(pendingId, userId(auth), body)
        ));
    }

    @PostMapping("/{pendingId}/reject")
    public ResponseEntity<ApiResponse<PendingSkill>> reject(
        Authentication auth,
        @PathVariable String pendingId,
        @Valid @RequestBody(required = false) RejectPendingSkillRequest req
    ) {
        ensureAdmin(auth);
        RejectPendingSkillRequest body = req == null
            ? new RejectPendingSkillRequest(null)
            : req;
        return ResponseEntity.ok(ApiResponse.ok(
            governanceService.reject(pendingId, userId(auth), body)
        ));
    }

    private void ensureAdmin(Authentication auth) {
        boolean isAdmin = auth != null
            && auth.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch("ROLE_ADMIN"::equals);
        if (!isAdmin) {
            throw new org.springframework.security.access.AccessDeniedException("Admin role required");
        }
    }

    private String userId(Authentication auth) {
        return (String) auth.getPrincipal();
    }
}
