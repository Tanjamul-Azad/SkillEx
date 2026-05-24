package com.skillex.controller;

import com.skillex.dto.admin.PlatformRuleDto;
import com.skillex.dto.admin.UpsertPlatformRuleRequest;
import com.skillex.dto.common.ApiResponse;
import com.skillex.service.PlatformRuleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/rules")
@RequiredArgsConstructor
public class RuleController {
    private final PlatformRuleService ruleService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<PlatformRuleDto>>> list(Authentication auth) {
        ensureAdmin(auth);
        return ResponseEntity.ok(ApiResponse.ok(ruleService.list()));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<PlatformRuleDto>> create(
        Authentication auth,
        @Valid @RequestBody UpsertPlatformRuleRequest req
    ) {
        ensureAdmin(auth);
        return ResponseEntity.ok(ApiResponse.ok(ruleService.create(userId(auth), req)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<PlatformRuleDto>> update(
        Authentication auth,
        @PathVariable String id,
        @Valid @RequestBody UpsertPlatformRuleRequest req
    ) {
        ensureAdmin(auth);
        return ResponseEntity.ok(ApiResponse.ok(ruleService.update(userId(auth), id, req)));
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
