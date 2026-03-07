package com.skillex.service.impl;

import com.skillex.dto.common.PagedResponse;
import com.skillex.dto.user.*;
import com.skillex.model.Skill;
import com.skillex.model.User;
import com.skillex.model.UserSkillOffered;
import com.skillex.model.UserSkillWanted;
import com.skillex.repository.*;
import com.skillex.service.DtoMapper;
import com.skillex.service.UserService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Concrete implementation of UserService.
 *
 * OOP notes:
 *  - Implements interface → Dependency Inversion Principle
 *  - @Transactional(readOnly=true) on all reads for performance
 *  - Password change validated via PasswordEncoder before applying
 *  - Skill add/remove routed to dedicated junction repositories
 */
@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final SkillRepository skillRepository;
    private final UserSkillOfferedRepository offeredRepo;
    private final UserSkillWantedRepository wantedRepo;
    private final PasswordEncoder passwordEncoder;
    private final DtoMapper mapper;

    @Override
    @Transactional(readOnly = true)
    public UserProfileDto getProfile(String userId) {
        User user = findUserById(userId);
        return mapper.toProfile(user);
    }

    @Override
    @Transactional
    public UserProfileDto updateProfile(String userId, UpdateProfileRequest req) {
        User user = findUserById(userId);
        if (req.name()       != null) user.setName(req.name());
        if (req.university() != null) user.setUniversity(req.university());
        if (req.bio()        != null) user.setBio(req.bio());
        if (req.avatar()     != null) user.setAvatar(req.avatar());
        // email change — check uniqueness first
        if (req.email() != null && !req.email().equals(user.getEmail())) {
            if (userRepository.existsByEmail(req.email())) {
                throw new IllegalArgumentException("Email already in use.");
            }
            user.setEmail(req.email());
        }
        return mapper.toProfile(userRepository.save(user));
    }

    @Override
    @Transactional
    public void changePassword(String userId, ChangePasswordRequest req) {
        User user = findUserById(userId);
        if (!passwordEncoder.matches(req.currentPassword(), user.getPasswordHash())) {
            throw new IllegalArgumentException("Current password is incorrect.");
        }
        user.setPasswordHash(passwordEncoder.encode(req.newPassword()));
        userRepository.save(user);
    }

    @Override
    @Transactional
    public void addSkill(String userId, AddSkillRequest req) {
        User user  = findUserById(userId);
        Skill skill = skillRepository.findById(req.skillId())
            .orElseThrow(() -> new EntityNotFoundException("Skill not found: " + req.skillId()));

        UserSkillOffered.SkillProficiency level =
            UserSkillOffered.SkillProficiency.valueOf(req.level());

        if ("offered".equalsIgnoreCase(req.type())) {
            // Avoid duplicate — delete existing entry first if present
            offeredRepo.deleteByIdUserIdAndIdSkillId(userId, skill.getId());
            UserSkillOffered entry = UserSkillOffered.builder()
                .id(new UserSkillOffered.UserSkillId(userId, skill.getId()))
                .user(user).skill(skill).level(level)
                .build();
            offeredRepo.save(entry);
            if (!user.getSkillsOffered().contains(skill)) {
                user.getSkillsOffered().add(skill);
            }
        } else {
            wantedRepo.deleteByIdUserIdAndIdSkillId(userId, skill.getId());
            UserSkillWanted entry = UserSkillWanted.builder()
                .id(new UserSkillWanted.UserSkillId(userId, skill.getId()))
                .user(user).skill(skill).level(level)
                .build();
            wantedRepo.save(entry);
            if (!user.getSkillsWanted().contains(skill)) {
                user.getSkillsWanted().add(skill);
            }
        }
        userRepository.save(user);
    }

    @Override
    @Transactional
    public void removeSkill(String userId, String skillId, String type) {
        if ("offered".equalsIgnoreCase(type)) {
            offeredRepo.deleteByIdUserIdAndIdSkillId(userId, skillId);
            User user = findUserById(userId);
            user.getSkillsOffered().removeIf(s -> s.getId().equals(skillId));
            userRepository.save(user);
        } else {
            wantedRepo.deleteByIdUserIdAndIdSkillId(userId, skillId);
            User user = findUserById(userId);
            user.getSkillsWanted().removeIf(s -> s.getId().equals(skillId));
            userRepository.save(user);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<UserSummaryDto> searchUsers(String query, int page, int size) {
        var pageable = PageRequest.of(page, size, Sort.by("skillexScore").descending());
        var results  = (query == null || query.isBlank())
            ? userRepository.findAll(pageable).map(mapper::toSummary)
            : userRepository.findByNameContainingIgnoreCaseOrUniversityContainingIgnoreCase(
                query, query, pageable).map(mapper::toSummary);
        return PagedResponse.of(results);
    }

    @Override
    @Transactional
    public void deleteAccount(String userId) {
        if (!userRepository.existsById(userId)) {
            throw new EntityNotFoundException("User not found: " + userId);
        }
        userRepository.deleteById(userId);
    }

    // ── Private helpers ──────────────────────────────────────────────────────

    private User findUserById(String userId) {
        return userRepository.findById(userId)
            .orElseThrow(() -> new EntityNotFoundException("User not found: " + userId));
    }
}
