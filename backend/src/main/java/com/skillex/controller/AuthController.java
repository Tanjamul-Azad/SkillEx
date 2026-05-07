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

    /** POST /api/auth/register */
    @PostMapping("/register")
    public ResponseEntity<ApiResponse<AuthResponse>> register(
        @Valid @RequestBody RegisterRequest request
    ) {
        AuthResponse response = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(response));
    }

    /** POST /api/auth/login */
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(
        @Valid @RequestBody LoginRequest request
    ) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    /** POST /api/auth/firebase/google */
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

    /** POST /api/auth/refresh */
    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<AuthResponse>> refresh(
        @Valid @RequestBody RefreshTokenRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(authService.refresh(request)));
    }

    /** POST /api/auth/logout */
    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<String>> logout(Authentication authentication) {
        String userId = (String) authentication.getPrincipal();
        authService.logout(userId);
        return ResponseEntity.ok(ApiResponse.ok("Logged out."));
    }

    /** GET /api/auth/me  — requires Authorization: Bearer <token> */
    @GetMapping("/me")
public ResponseEntity<ApiResponse<UserProfileDto>> me(Authentication authentication) {
        String userId = (String) authentication.getPrincipal();
        var user = authService.getCurrentUser(userId);
        return ResponseEntity.ok(ApiResponse.ok(dtoMapper.toProfile(user)));
    }
}
