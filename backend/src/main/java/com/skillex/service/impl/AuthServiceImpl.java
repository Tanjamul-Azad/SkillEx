package com.skillex.service.impl;

import com.skillex.dto.auth.AuthResponse;
import com.skillex.dto.auth.LoginRequest;
import com.skillex.dto.auth.RegisterRequest;
import com.skillex.model.User;
import com.skillex.repository.UserRepository;
import com.skillex.service.AuthService;
import com.skillex.config.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.NonNull;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Concrete implementation of AuthService.
 *
 * OOP notes:
 *  - Implements interface  → open/closed, dependency inversion
 *  - @RequiredArgsConstructor → constructor injection (encapsulation)
 *  - @Transactional          → declarative transaction boundary
 */
@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    @Override
    @Transactional
    @SuppressWarnings("null")
    public AuthResponse register(RegisterRequest req) {
        if (userRepository.existsByEmail(req.email())) {
            throw new IllegalArgumentException("An account with this email already exists.");
        }

        User user = User.builder()
            .name(req.name())
            .email(req.email())
            .passwordHash(passwordEncoder.encode(req.password()))
            .university(req.university())
            .build();

        user = userRepository.save(user);
        String token = jwtUtil.generateToken(user.getId(), user.getEmail(), user.getRole().name());
        return toAuthResponse(token, user);
    }

    @Override
    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest req) {
        User user = userRepository.findByEmail(req.email())
            .orElseThrow(() -> new IllegalArgumentException("Invalid email or password."));

        if (!passwordEncoder.matches(req.password(), user.getPasswordHash())) {
            throw new IllegalArgumentException("Invalid email or password.");
        }

        String token = jwtUtil.generateToken(user.getId(), user.getEmail(), user.getRole().name());
        return toAuthResponse(token, user);
    }

    @Override
    @Transactional(readOnly = true)
    public User getCurrentUser(@NonNull String userId) {
        return userRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("User not found."));
    }

    // ── Private helpers ──────────────────────────────────────────────────────

    private AuthResponse toAuthResponse(String token, User user) {
        return new AuthResponse(token, new AuthResponse.UserSnapshot(
            user.getId(),
            user.getName(),
            user.getEmail(),
            user.getUniversity(),
            user.getAvatarUrl(),
            user.getRole().name().toLowerCase(),
            user.getSkillexScore(),
            user.getSessionsCompleted()
        ));
    }
}
