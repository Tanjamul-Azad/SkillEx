package com.skillex.controller;

import com.skillex.dto.auth.AuthResponse;
import com.skillex.dto.auth.LoginRequest;
import com.skillex.dto.auth.RegisterRequest;
import com.skillex.dto.common.ApiResponse;
import com.skillex.dto.user.UserProfileDto;
import com.skillex.service.AuthService;
import com.skillex.service.DtoMapper;
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

    /** GET /api/auth/me  — requires Authorization: Bearer <token> */
    @GetMapping("/me")
    @SuppressWarnings("null")
    public ResponseEntity<ApiResponse<UserProfileDto>> me(Authentication authentication) {
        String userId = (String) authentication.getPrincipal();
        var user = authService.getCurrentUser(userId);
        return ResponseEntity.ok(ApiResponse.ok(dtoMapper.toProfile(user)));
    }
}
