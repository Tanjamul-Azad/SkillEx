package com.skillex.service.impl;

import com.skillex.dto.auth.AuthResponse;
import com.skillex.dto.auth.LoginRequest;
import com.skillex.dto.auth.RegisterRequest;
import com.skillex.dto.skill.SkillIntentInterpretRequest;
import com.skillex.dto.skill.SkillIntentInterpretResponse;
import com.skillex.dto.skill.SkillIntentInterpretResultDto;
import com.skillex.dto.skill.SkillIntentSuggestionDto;
import com.skillex.model.Skill;
import com.skillex.model.User;
import com.skillex.model.UserSkillOffered;
import com.skillex.model.UserSkillWanted;
import com.skillex.repository.SkillRepository;
import com.skillex.repository.UserRepository;
import com.skillex.repository.UserSkillOfferedRepository;
import com.skillex.repository.UserSkillWantedRepository;
import com.skillex.service.AuthService;
import com.skillex.service.DtoMapper;
import com.skillex.service.SkillIntentService;
import com.skillex.config.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.NonNull;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

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
    private final SkillIntentService skillIntentService;

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
            .teachIntentText(sanitizeIntentText(req.skillToTeach()))
            .learnIntentText(sanitizeIntentText(req.skillToLearn()))
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
     * registration form by resolving text to existing catalog skills.
     * Unresolved text is ignored so registration never fails on bad input.
     */
    private void saveRegistrationSkills(User user, RegisterRequest req) {
        UserSkillOffered.SkillProficiency proficiency = parseProficiency(req.level());

        // Write only through the junction entity repos — DtoMapper.toProfile() reads them
        // directly.  Do NOT also add to user.getSkillsOffered() / getSkillsWanted() and
        // call userRepository.save(), as that would generate a duplicate-key INSERT on the
        // same user_skills_offered / user_skills_wanted row.
        if (req.skillToTeach() != null && !req.skillToTeach().isBlank()) {
            resolveRegistrationSkill(req.skillToTeach(), true).ifPresent(skill ->
                offeredRepo.save(UserSkillOffered.builder()
                    .id(new UserSkillOffered.UserSkillId(user.getId(), skill.getId()))
                    .user(user).skill(skill).level(proficiency)
                    .build()));
        }

        if (req.skillToLearn() != null && !req.skillToLearn().isBlank()) {
            resolveRegistrationSkill(req.skillToLearn(), false).ifPresent(skill ->
                wantedRepo.save(UserSkillWanted.builder()
                    .id(new UserSkillWanted.UserSkillId(user.getId(), skill.getId()))
                    .user(user).skill(skill).level(proficiency)
                    .build()));
        }
    }

    private Optional<Skill> resolveRegistrationSkill(String rawName, boolean teachSide) {
        String normalizedName = normalizeSkillName(rawName);
        Optional<Skill> exact = skillRepository.findByNameIgnoreCase(normalizedName);
        if (exact.isPresent()) {
            return exact;
        }

        SkillIntentInterpretRequest request = teachSide
            ? new SkillIntentInterpretRequest(rawName, null)
            : new SkillIntentInterpretRequest(null, rawName);

        SkillIntentInterpretResponse interpreted = skillIntentService.interpret(request);
        SkillIntentInterpretResultDto side = teachSide ? interpreted.teach() : interpreted.learn();
        if (side == null) {
            return Optional.empty();
        }

        String selectedSkillId = firstCatalogSkillId(side);
        if (selectedSkillId == null || selectedSkillId.isBlank()) {
            return Optional.empty();
        }

        return skillRepository.findById(selectedSkillId);
    }

    private String normalizeSkillName(String rawName) {
        String normalized = rawName == null ? "" : rawName
            .replaceAll("[^A-Za-z0-9\\s+/#.-]", " ")
            .replaceAll("\\s+", " ")
            .trim();

        if (normalized.isBlank()) {
            return "";
        }

        return normalized;
    }

    private String sanitizeIntentText(String raw) {
        if (raw == null) {
            return null;
        }
        String normalized = raw
            .replaceAll("\\s+", " ")
            .trim();
        return normalized.isBlank() ? null : normalized;
    }

    private String firstCatalogSkillId(SkillIntentInterpretResultDto side) {
        SkillIntentSuggestionDto primary = side.primary();
        if (primary != null && primary.skillId() != null && !primary.skillId().isBlank()) {
            return primary.skillId();
        }

        List<SkillIntentSuggestionDto> alternatives = side.alternatives();
        if (alternatives == null) {
            return null;
        }

        return alternatives.stream()
            .map(SkillIntentSuggestionDto::skillId)
            .filter(id -> id != null && !id.isBlank())
            .findFirst()
            .orElse(null);
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
