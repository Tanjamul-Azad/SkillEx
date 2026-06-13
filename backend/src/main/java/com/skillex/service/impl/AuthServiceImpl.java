package com.skillex.service.impl;

import com.skillex.dto.auth.AuthResponse;
import com.skillex.dto.auth.LoginRequest;
import com.skillex.dto.auth.RefreshTokenRequest;
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
import java.util.UUID;

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

    private static final int USERNAME_MAX_LEN = 50;

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
        String email = normalizeEmail(req.email());
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new IllegalArgumentException("An account with this email already exists.");
        }

        String username = generateUniqueUsername(req.name(), email);

        User user = User.builder()
            .name(req.name())
            .username(username)
            .email(email)
            .passwordHash(passwordEncoder.encode(req.password()))
            .university(req.university())
            .teachIntentText(sanitizeIntentText(req.skillToTeach()))
            .learnIntentText(sanitizeIntentText(req.skillToLearn()))
            .build();

        user = userRepository.save(user);

        // Persist initial skills chosen during registration
        saveRegistrationSkills(user, req);

        user = normalizeUserProfile(user);
        String token = jwtUtil.generateToken(user.getId(), user.getEmail(), safeRole(user).name());
        return toAuthResponse(token, user);
    }

    @Override
    @Transactional
    public AuthResponse login(LoginRequest req) {
        String email = normalizeEmail(req.email());
        User user = userRepository.findByEmailIgnoreCase(email)
            .orElseThrow(() -> new IllegalArgumentException("Invalid email or password."));

        String passwordHash = user.getPasswordHash();
        if (passwordHash == null || passwordHash.isBlank()) {
            throw new IllegalArgumentException("This account uses Google sign-in. Use Continue with Google.");
        }

        if (!passwordEncoder.matches(req.password(), passwordHash)) {
            throw new IllegalArgumentException("Invalid email or password.");
        }

        user = normalizeUserProfile(user);
        String token = jwtUtil.generateToken(user.getId(), user.getEmail(), safeRole(user).name());
        return toAuthResponse(token, user);
    }

    @Override
    @Transactional
    public AuthResponse loginWithGoogle(String email, String name, String avatarUrl) {
        email = normalizeEmail(email);
        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException("Google account email is required.");
        }

        String verifiedEmail = email;
        User user = userRepository.findByEmailIgnoreCase(verifiedEmail).orElseGet(() -> {
            String displayName = firstNonBlank(name, emailLocalPart(verifiedEmail), "SkillEX User");
            String username = generateUniqueUsername(displayName, verifiedEmail);

            return userRepository.save(User.builder()
                .name(displayName)
                .username(username)
                .email(verifiedEmail)
                // Required by current schema (password_hash is non-null) even for OAuth users.
                .passwordHash(passwordEncoder.encode(UUID.randomUUID().toString()))
                .avatar(sanitizeIntentText(avatarUrl))
                .build());
        });

        user = normalizeUserProfile(user);

        if ((user.getAvatar() == null || user.getAvatar().isBlank()) && avatarUrl != null && !avatarUrl.isBlank()) {
            user.setAvatar(avatarUrl);
            user = userRepository.save(user);
        }

        String token = jwtUtil.generateToken(user.getId(), user.getEmail(), safeRole(user).name());
        return toAuthResponse(token, user);
    }

    @Override
    @Transactional(readOnly = true)
    public AuthResponse refresh(RefreshTokenRequest request) {
        String token = request == null ? null : request.token();
        if (token == null || token.isBlank()) {
            throw new IllegalArgumentException("Refresh token is required.");
        }

        String userId = jwtUtil.extractUserId(token);
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("Invalid refresh token."));
        user = normalizeUserProfile(user);

        String newToken = jwtUtil.generateToken(user.getId(), user.getEmail(), safeRole(user).name());
        return toAuthResponse(newToken, user);
    }

    @Override
    public void logout(String userId) {
        // Stateless JWT logout is client-driven (discard token on client).
        // Hook kept for API contract compatibility and future token blacklist support.
    }

    @Override
    @Transactional(readOnly = true)
    public User getCurrentUser(@NonNull String userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("User not found."));
        return normalizeUserProfile(user);
    }

    // Private helpers

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

    private String normalizeEmail(String raw) {
        if (raw == null) {
            return null;
        }
        String normalized = raw
            .replaceAll("\\s+", "")
            .trim()
            .toLowerCase();
        return normalized.isBlank() ? null : normalized;
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

    private String generateUniqueUsername(String name, String email) {
        String base = normalizeUsernameSeed(name, email);
        String candidate = base;
        int suffix = 1;

        while (userRepository.existsByUsername(candidate)) {
            String suffixText = "_" + suffix;
            int maxBaseLen = USERNAME_MAX_LEN - suffixText.length();
            String trimmedBase = base.length() > maxBaseLen
                ? base.substring(0, maxBaseLen)
                : base;
            candidate = trimmedBase + suffixText;
            suffix++;
        }

        return candidate;
    }

    private String normalizeUsernameSeed(String name, String email) {
        String seed = firstNonBlank(name, emailLocalPart(email), "user");
        String normalized = seed.toLowerCase()
            .replaceAll("[^a-z0-9._-]", "_")
            .replaceAll("_+", "_")
            .replaceAll("^[._-]+", "")
            .replaceAll("[._-]+$", "");

        if (normalized.isBlank()) {
            normalized = "user";
        }

        if (normalized.length() > USERNAME_MAX_LEN) {
            normalized = normalized.substring(0, USERNAME_MAX_LEN);
        }

        return normalized;
    }

    private String emailLocalPart(String email) {
        if (email == null || email.isBlank()) {
            return "";
        }
        int at = email.indexOf('@');
        if (at <= 0) {
            return email;
        }
        return email.substring(0, at);
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return "";
    }

    private User normalizeUserProfile(User user) {
        boolean needsSave = false;

        if (user.getRole() == null) {
            user.setRole(User.UserRole.STUDENT);
            needsSave = true;
        }

        if (user.getLevel() == null) {
            user.setLevel(User.UserLevel.NEWCOMER);
            needsSave = true;
        }

        if (user.getIsOnline() == null) {
            user.setIsOnline(false);
            needsSave = true;
        }

        if (user.getConnectionsPublic() == null) {
            user.setConnectionsPublic(true);
            needsSave = true;
        }

        if (needsSave) {
            user = userRepository.save(user);
        }

        return user;
    }

    private User.UserRole safeRole(User user) {
        return user.getRole() == null ? User.UserRole.STUDENT : user.getRole();
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
