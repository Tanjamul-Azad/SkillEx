package com.skillex.controller;

import com.skillex.dto.auth.AuthResponse;
import com.skillex.dto.auth.FirebaseGoogleLoginRequest;
import com.skillex.dto.auth.LoginRequest;
import com.skillex.dto.auth.RefreshTokenRequest;
import com.skillex.dto.auth.RegisterRequest;
import com.skillex.dto.common.ApiResponse;
import com.skillex.dto.user.UserProfileDto;
import com.skillex.service.AuthService;
import com.skillex.service.DtoMapper;
import com.skillex.service.FirebaseTokenVerifier;
import com.skillex.service.LoginAttemptService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

/**
 * REST controller for authentication endpoints.
 * Base path: /api/auth
 *
 * Endpoints consumed by frontend/src/services/authService.ts
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final DtoMapper dtoMapper;
    private final FirebaseTokenVerifier firebaseTokenVerifier;
    private final LoginAttemptService loginAttemptService;

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<AuthResponse>> register(
        @Valid @RequestBody RegisterRequest request
    ) {
        AuthResponse response = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(response));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(
        HttpServletRequest httpRequest,
        @Valid @RequestBody LoginRequest request
    ) {
        String clientKey = clientIp(httpRequest);
        loginAttemptService.assertNotBlocked(clientKey);
        try {
            AuthResponse response = authService.login(request);
            loginAttemptService.recordSuccess(clientKey);
            return ResponseEntity.ok(ApiResponse.ok(response));
        } catch (RuntimeException ex) {
            // Failed credentials (or any login error) count toward the per-IP rate limit.
            loginAttemptService.recordFailure(clientKey);
            throw ex;
        }
    }

    @PostMapping("/firebase/google")
    public ResponseEntity<ApiResponse<AuthResponse>> loginWithFirebaseGoogle(
        @Valid @RequestBody FirebaseGoogleLoginRequest request
    ) {
        var verified = firebaseTokenVerifier.verifyGoogleIdToken(request.idToken());
        AuthResponse response = authService.loginWithGoogle(
            verified.email(),
            verified.name(),
            verified.picture()
        );
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<AuthResponse>> refresh(
        @Valid @RequestBody RefreshTokenRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(authService.refresh(request)));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<String>> logout(Authentication authentication) {
        String userId = (String) authentication.getPrincipal();
        authService.logout(userId);
        return ResponseEntity.ok(ApiResponse.ok("Logged out."));
    }

    @GetMapping("/me")
public ResponseEntity<ApiResponse<UserProfileDto>> me(Authentication authentication) {
        String userId = (String) authentication.getPrincipal();
        var user = authService.getCurrentUser(userId);
        return ResponseEntity.ok(ApiResponse.ok(dtoMapper.toProfile(user)));
    }

    /** Resolves the originating client IP, honouring a single X-Forwarded-For hop if present. */
    private String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
