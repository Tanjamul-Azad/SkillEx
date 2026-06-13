package com.skillex.controller;

import com.skillex.dto.common.ApiResponse;
import com.skillex.dto.common.PagedResponse;
import com.skillex.dto.moderation.UserRestrictionDto;
import com.skillex.dto.user.*;
import com.skillex.service.AccountRestrictionService;
import com.skillex.service.SkillTrustService;
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
    private final AccountRestrictionService restrictionService;
    private final SkillTrustService skillTrustService;

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserProfileDto>> myProfile(Authentication auth) {
        return ResponseEntity.ok(ApiResponse.ok(userService.getProfile(userId(auth))));
    }

    @GetMapping("/me/restrictions")
    public ResponseEntity<ApiResponse<java.util.List<UserRestrictionDto>>> myRestrictions(Authentication auth) {
        return ResponseEntity.ok(ApiResponse.ok(restrictionService.getActiveRestrictionDtos(userId(auth))));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<UserProfileDto>> getProfile(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.ok(userService.getProfile(id)));
    }

    @PatchMapping("/me")
    public ResponseEntity<ApiResponse<UserProfileDto>> updateProfile(
        Authentication auth,
        @Valid @RequestBody UpdateProfileRequest req
    ) {
        return ResponseEntity.ok(ApiResponse.ok(userService.updateProfile(userId(auth), req)));
    }

    @PutMapping("/me")
    public ResponseEntity<ApiResponse<UserProfileDto>> updateProfilePut(
        Authentication auth,
        @Valid @RequestBody UpdateProfileRequest req
    ) {
        return ResponseEntity.ok(ApiResponse.ok(userService.updateProfile(userId(auth), req)));
    }

    @GetMapping("/{id}/skills")
    public ResponseEntity<ApiResponse<UserSkillsDto>> getUserSkills(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.ok(userService.getSkills(id)));
    }

    @GetMapping("/{userId}/skills/{skillId}/trust")
    public ResponseEntity<ApiResponse<com.skillex.dto.trust.SkillTrustDto>> getSkillTrust(
        @PathVariable String userId,
        @PathVariable String skillId
    ) {
        return ResponseEntity.ok(ApiResponse.ok(skillTrustService.getTrust(userId, skillId)));
    }

    @PostMapping("/me/change-password")
    public ResponseEntity<ApiResponse<String>> changePassword(
        Authentication auth,
        @Valid @RequestBody ChangePasswordRequest req
    ) {
        userService.changePassword(userId(auth), req);
        return ResponseEntity.ok(ApiResponse.ok("Password changed successfully."));
    }

    @PostMapping("/me/skills")
    public ResponseEntity<ApiResponse<AddSkillResult>> addSkill(
        Authentication auth,
        @Valid @RequestBody AddSkillRequest req
    ) {
        return ResponseEntity.ok(ApiResponse.ok(userService.addSkill(userId(auth), req)));
    }

    @PatchMapping("/me/skills/{skillId}")
    public ResponseEntity<ApiResponse<String>> updateSkillSubtitle(
        Authentication auth,
        @PathVariable String skillId,
        @Valid @RequestBody UpdateSkillSubtitleRequest req
    ) {
        userService.updateSkillSubtitle(userId(auth), skillId, req.subtitle());
        return ResponseEntity.ok(ApiResponse.ok("Skill description updated."));
    }

    @DeleteMapping("/me/skills/{skillId}")
    public ResponseEntity<ApiResponse<String>> removeSkill(
        Authentication auth,
        @PathVariable String skillId,
        @RequestParam(defaultValue = "offered") String type
    ) {
        userService.removeSkill(userId(auth), skillId, type);
        return ResponseEntity.ok(ApiResponse.ok("Skill removed."));
    }

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<PagedResponse<UserSearchResultDto>>> searchUsers(
        Authentication auth,
        @RequestParam(required = false, name = "q") String query,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        return ResponseEntity.ok(ApiResponse.ok(userService.searchUsers(userId(auth), query, page, size)));
    }

    @DeleteMapping("/me")
    public ResponseEntity<ApiResponse<String>> deleteAccount(Authentication auth) {
        userService.deleteAccount(userId(auth));
        return ResponseEntity.ok(ApiResponse.ok("Account deleted."));
    }

    @PostMapping("/me/connect-email/request-otp")
    public ResponseEntity<ApiResponse<String>> requestEmailConnectOtp(
        Authentication auth,
        @Valid @RequestBody RequestOtpRequest req
    ) {
        userService.requestEmailConnectOtp(userId(auth), req);
        return ResponseEntity.ok(ApiResponse.ok("OTP sent to new email."));
    }

    @PostMapping("/me/connect-email/verify-otp")
    public ResponseEntity<ApiResponse<String>> verifyEmailConnectOtp(
        Authentication auth,
        @Valid @RequestBody VerifyOtpRequest req
    ) {
        userService.verifyEmailConnectOtp(userId(auth), req);
        return ResponseEntity.ok(ApiResponse.ok("Email successfully connected."));
    }

    // helpers

    private String userId(Authentication auth) {
        return (String) auth.getPrincipal();
    }
}
