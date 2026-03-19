package com.skillex.controller;

import com.skillex.dto.common.ApiResponse;
import com.skillex.dto.common.PagedResponse;
import com.skillex.dto.user.*;
import com.skillex.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

/**
 * REST controller for user profile operations.
 * Base path: /api/users
 */
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    /** GET /api/users/me — currently authenticated user's full profile */
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserProfileDto>> myProfile(Authentication auth) {
        return ResponseEntity.ok(ApiResponse.ok(userService.getProfile(userId(auth))));
    }

    /** GET /api/users/{id} — public profile */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<UserProfileDto>> getProfile(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.ok(userService.getProfile(id)));
    }

    /** PATCH /api/users/me — update own profile */
    @PatchMapping("/me")
    public ResponseEntity<ApiResponse<UserProfileDto>> updateProfile(
        Authentication auth,
        @Valid @RequestBody UpdateProfileRequest req
    ) {
        return ResponseEntity.ok(ApiResponse.ok(userService.updateProfile(userId(auth), req)));
    }

    /** POST /api/users/me/change-password */
    @PostMapping("/me/change-password")
    public ResponseEntity<ApiResponse<String>> changePassword(
        Authentication auth,
        @Valid @RequestBody ChangePasswordRequest req
    ) {
        userService.changePassword(userId(auth), req);
        return ResponseEntity.ok(ApiResponse.ok("Password changed successfully."));
    }

    /** POST /api/users/me/skills — add a skill (offered or wanted) */
    @PostMapping("/me/skills")
    public ResponseEntity<ApiResponse<AddSkillResult>> addSkill(
        Authentication auth,
        @Valid @RequestBody AddSkillRequest req
    ) {
        return ResponseEntity.ok(ApiResponse.ok(userService.addSkill(userId(auth), req)));
    }

    /** DELETE /api/users/me/skills/{skillId}?type=offered|wanted */
    @DeleteMapping("/me/skills/{skillId}")
    public ResponseEntity<ApiResponse<String>> removeSkill(
        Authentication auth,
        @PathVariable String skillId,
        @RequestParam(defaultValue = "offered") String type
    ) {
        userService.removeSkill(userId(auth), skillId, type);
        return ResponseEntity.ok(ApiResponse.ok("Skill removed."));
    }

    /** GET /api/users?query=&page=0&size=20 — search users */
    @GetMapping
    public ResponseEntity<ApiResponse<PagedResponse<UserSummaryDto>>> searchUsers(
        @RequestParam(required = false) String query,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        return ResponseEntity.ok(ApiResponse.ok(userService.searchUsers(query, page, size)));
    }

    /** DELETE /api/users/me — delete own account */
    @DeleteMapping("/me")
    public ResponseEntity<ApiResponse<String>> deleteAccount(Authentication auth) {
        userService.deleteAccount(userId(auth));
        return ResponseEntity.ok(ApiResponse.ok("Account deleted."));
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private String userId(Authentication auth) {
        return (String) auth.getPrincipal();
    }
}
