package com.skillex.controller;

import com.skillex.dto.common.ApiResponse;
import com.skillex.model.User;
import com.skillex.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.NonNull;
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

    private final UserRepository userRepository;

    /** GET /api/users/{id} */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<User>> getProfile(@PathVariable @NonNull String id) {
        return userRepository.findById(id)
            .map(user -> ResponseEntity.ok(ApiResponse.ok(user)))
            .orElse(ResponseEntity.notFound().build());
    }

    /** GET /api/users/me  — returns profile of currently authenticated user */
    @GetMapping("/me")
    @SuppressWarnings("null")
    public ResponseEntity<ApiResponse<User>> myProfile(Authentication authentication) {
        String userId = (String) authentication.getPrincipal();
        return userRepository.findById(userId)
            .map(user -> ResponseEntity.ok(ApiResponse.ok(user)))
            .orElse(ResponseEntity.notFound().build());
    }
}
