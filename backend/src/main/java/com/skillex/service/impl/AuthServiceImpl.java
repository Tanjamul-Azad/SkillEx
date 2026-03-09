package com.skillex.service.impl;

import com.skillex.dto.auth.AuthResponse;
import com.skillex.dto.auth.LoginRequest;
import com.skillex.dto.auth.RegisterRequest;
import com.skillex.model.User;
import com.skillex.model.UserSkillOffered;
import com.skillex.model.UserSkillWanted;
import com.skillex.repository.SkillRepository;
import com.skillex.repository.UserRepository;
import com.skillex.repository.UserSkillOfferedRepository;
import com.skillex.repository.UserSkillWantedRepository;
import com.skillex.service.AuthService;
import com.skillex.service.DtoMapper;
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
@SuppressWarnings("null")
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final SkillRepository skillRepository;
    private final UserSkillOfferedRepository offeredRepo;
    private final UserSkillWantedRepository wantedRepo;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final DtoMapper mapper;

    @Override
    @Transactional
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

        // Persist initial skills chosen during registration
        saveRegistrationSkills(user, req);

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

    /** Builds the auth response with a full profile DTO so no second round-trip is needed. */
    private AuthResponse toAuthResponse(String token, User user) {
        return new AuthResponse(token, mapper.toProfile(user));
    }

    /**
     * Saves the skillToTeach (offered) and skillToLearn (wanted) chosen on the
     * registration form.  Unrecognised skill names are silently ignored so that
     * a typo on the client side never blocks registration.
     */
    private void saveRegistrationSkills(User user, RegisterRequest req) {
        UserSkillOffered.SkillProficiency proficiency = parseProficiency(req.level());

        // Write only through the junction entity repos — DtoMapper.toProfile() reads them
        // directly.  Do NOT also add to user.getSkillsOffered() / getSkillsWanted() and
        // call userRepository.save(), as that would generate a duplicate-key INSERT on the
        // same user_skills_offered / user_skills_wanted row.
        if (req.skillToTeach() != null && !req.skillToTeach().isBlank()) {
            skillRepository.findByNameIgnoreCase(req.skillToTeach().trim()).ifPresent(skill ->
                offeredRepo.save(UserSkillOffered.builder()
                    .id(new UserSkillOffered.UserSkillId(user.getId(), skill.getId()))
                    .user(user).skill(skill).level(proficiency)
                    .build())
            );
        }

        if (req.skillToLearn() != null && !req.skillToLearn().isBlank()) {
            skillRepository.findByNameIgnoreCase(req.skillToLearn().trim()).ifPresent(skill ->
                wantedRepo.save(UserSkillWanted.builder()
                    .id(new UserSkillWanted.UserSkillId(user.getId(), skill.getId()))
                    .user(user).skill(skill).level(proficiency)
                    .build())
            );
        }
    }

    private UserSkillOffered.SkillProficiency parseProficiency(String raw) {
        if (raw == null) return UserSkillOffered.SkillProficiency.BEGINNER;
        try {
            return UserSkillOffered.SkillProficiency.valueOf(raw.toUpperCase());
        } catch (IllegalArgumentException e) {
            return UserSkillOffered.SkillProficiency.BEGINNER;
        }
    }
}
