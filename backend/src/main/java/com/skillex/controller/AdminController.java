package com.skillex.controller;

import com.skillex.dto.admin.AdminAuditLogDto;
import com.skillex.dto.admin.AdminOverviewDto;
import com.skillex.dto.common.ApiResponse;
import com.skillex.dto.common.PagedResponse;
import com.skillex.service.AdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {
    private final AdminService adminService;

    @GetMapping("/overview")
    public ResponseEntity<ApiResponse<AdminOverviewDto>> overview(Authentication auth) {
        ensureAdmin(auth);
        return ResponseEntity.ok(ApiResponse.ok(adminService.overview()));
    }

    @GetMapping("/audit-logs")
    public ResponseEntity<ApiResponse<PagedResponse<AdminAuditLogDto>>> auditLogs(
        Authentication auth,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        ensureAdmin(auth);
        return ResponseEntity.ok(ApiResponse.ok(adminService.auditLogs(page, size)));
    }

    private void ensureAdmin(Authentication auth) {
        boolean isAdmin = auth != null && auth.getAuthorities().stream()
            .map(GrantedAuthority::getAuthority)
            .anyMatch("ROLE_ADMIN"::equals);
        if (!isAdmin) throw new AccessDeniedException("Admin role required");
    }
}
