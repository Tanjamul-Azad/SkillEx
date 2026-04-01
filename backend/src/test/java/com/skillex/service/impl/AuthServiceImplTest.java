package com.skillex.service.impl;

import com.skillex.config.JwtUtil;
import com.skillex.dto.auth.AuthResponse;
import com.skillex.dto.auth.LoginRequest;
import com.skillex.dto.auth.RegisterRequest;
import com.skillex.dto.user.UserProfileDto;
import com.skillex.model.User;
import com.skillex.repository.SkillRepository;
import com.skillex.repository.UserRepository;
import com.skillex.repository.UserSkillOfferedRepository;
import com.skillex.repository.UserSkillWantedRepository;
import com.skillex.service.DtoMapper;
import com.skillex.service.SkillIntentService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceImplTest {

    @Mock private UserRepository userRepository;
    @Mock private SkillRepository skillRepository;
    @Mock private UserSkillOfferedRepository offeredRepository;
    @Mock private UserSkillWantedRepository wantedRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private JwtUtil jwtUtil;
    @Mock private DtoMapper dtoMapper;
    @Mock private SkillIntentService skillIntentService;

    @InjectMocks
    private AuthServiceImpl authService;

    @Test
    void register_shouldCreateUserAndReturnToken() {
        RegisterRequest request = new RegisterRequest(
            "Alice",
            "alice@example.com",
            "Passw0rd!",
            "Uni",
            null,
            null,
            "BEGINNER"
        );

        User saved = User.builder().id("u1").name("Alice").email("alice@example.com").passwordHash("enc").build();
        UserProfileDto profile = new UserProfileDto(
            "u1", "Alice", "alice_1", "alice@example.com", null,
            "Uni", null, null,
            null, null,
            "student", "NEWCOMER",
            0, 0, java.math.BigDecimal.ZERO, false, true,
            null, List.of(), List.of()
        );

        when(userRepository.existsByEmail("alice@example.com")).thenReturn(false);
        when(passwordEncoder.encode("Passw0rd!")).thenReturn("enc");
        when(userRepository.save(any(User.class))).thenReturn(saved);
        when(jwtUtil.generateToken("u1", "alice@example.com", "STUDENT")).thenReturn("jwt");
        when(dtoMapper.toProfile(saved)).thenReturn(profile);

        AuthResponse response = authService.register(request);

        assertEquals("jwt", response.token());
        assertEquals("u1", response.user().id());
    }

    @Test
    void login_shouldValidateCredentialsAndReturnToken() {
        LoginRequest request = new LoginRequest("alice@example.com", "Passw0rd!");
        User existing = User.builder().id("u1").name("Alice").email("alice@example.com").passwordHash("enc").build();
        UserProfileDto profile = new UserProfileDto(
            "u1", "Alice", "alice_1", "alice@example.com", null,
            "Uni", null, null,
            null, null,
            "student", "NEWCOMER",
            0, 0, java.math.BigDecimal.ZERO, false, true,
            null, List.of(), List.of()
        );

        when(userRepository.findByEmail("alice@example.com")).thenReturn(Optional.of(existing));
        when(passwordEncoder.matches("Passw0rd!", "enc")).thenReturn(true);
        when(jwtUtil.generateToken("u1", "alice@example.com", "STUDENT")).thenReturn("jwt");
        when(dtoMapper.toProfile(existing)).thenReturn(profile);

        AuthResponse response = authService.login(request);

        assertNotNull(response);
        assertEquals("jwt", response.token());
    }
}
