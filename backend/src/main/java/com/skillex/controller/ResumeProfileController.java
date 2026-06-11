package com.skillex.controller;

import com.skillex.dto.common.ApiResponse;
import com.skillex.dto.user.ApplyResumeProfileRequest;
import com.skillex.dto.user.ResumeProfileDto;
import com.skillex.dto.user.UserProfileDto;
import com.skillex.service.ResumeProfileService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/users/me/resume-profile")
@RequiredArgsConstructor
public class ResumeProfileController {
    private final ResumeProfileService resumeProfileService;

    @PostMapping(value = "/analyze", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<ResumeProfileDto>> analyzeResume(
        Authentication auth,
        @RequestParam("file") MultipartFile file
    ) {
        return ResponseEntity.ok(ApiResponse.ok(resumeProfileService.analyze(userId(auth), file)));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<ResumeProfileDto>> getResumeProfile(Authentication auth) {
        return ResponseEntity.ok(ApiResponse.ok(resumeProfileService.getLatest(userId(auth))));
    }

    @PostMapping("/apply")
    public ResponseEntity<ApiResponse<UserProfileDto>> applyResumeProfile(
        Authentication auth,
        @Valid @RequestBody ApplyResumeProfileRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(resumeProfileService.apply(userId(auth), request)));
    }

    private String userId(Authentication auth) {
        return (String) auth.getPrincipal();
    }
}
