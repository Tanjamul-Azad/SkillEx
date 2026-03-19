package com.skillex.service.impl;

import com.skillex.dto.common.PagedResponse;
import com.skillex.dto.user.*;
import com.skillex.model.Skill;
import com.skillex.model.User;
import com.skillex.model.UserSkillOffered;
import com.skillex.model.UserSkillWanted;
import com.skillex.repository.*;
import com.skillex.service.DtoMapper;
import com.skillex.service.SkillCatalogGovernanceService;
import com.skillex.service.UserService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
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
@SuppressWarnings("null")
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final SkillRepository skillRepository;
    private final UserSkillOfferedRepository offeredRepo;
    private final UserSkillWantedRepository wantedRepo;
    private final PasswordEncoder passwordEncoder;
    private final DtoMapper mapper;
    private final SkillCatalogGovernanceService skillCatalogGovernanceService;

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
        if (req.teachIntentText() != null) user.setTeachIntentText(req.teachIntentText().trim());
        if (req.learnIntentText() != null) user.setLearnIntentText(req.learnIntentText().trim());
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
    public AddSkillResult addSkill(String userId, AddSkillRequest req) {
        User user = findUserById(userId);
        UserSkillOffered.SkillProficiency level =
            UserSkillOffered.SkillProficiency.valueOf(req.level());

        // ── Resolve skill: catalog lookup by ID, or find/create by name ──────
        if (req.skillId() != null && !req.skillId().isBlank()) {
            Skill skill = skillRepository.findById(req.skillId())
                .orElseThrow(() -> new EntityNotFoundException("Skill not found: " + req.skillId()));
            attachSkill(user, skill, req.type(), level);
            return new AddSkillResult("ADDED", "Skill added to your profile.", skill.getId(), null);
        }

        String name = req.skillName().trim();
        Skill existing = skillRepository.findByNameIgnoreCase(name).orElse(null);
        if (existing != null) {
            attachSkill(user, existing, req.type(), level);
            return new AddSkillResult("ADDED", "Matched an existing catalog skill.", existing.getId(), null);
        }

        AddSkillResult pendingResult = skillCatalogGovernanceService.submitUnknownSkill(userId, req);
        if ("ADDED".equalsIgnoreCase(pendingResult.status())
            && pendingResult.skillId() != null
            && !pendingResult.skillId().isBlank()) {
            Skill promoted = skillRepository.findById(pendingResult.skillId())
                .orElseThrow(() -> new EntityNotFoundException("Promoted skill not found: " + pendingResult.skillId()));
            attachSkill(user, promoted, req.type(), level);
            return new AddSkillResult(
                "ADDED",
                "Skill auto-promoted and added to your profile.",
                promoted.getId(),
                pendingResult.pendingId()
            );
        }

        return pendingResult;
    }

    private void attachSkill(User user,
                             Skill skill,
                             String type,
                             UserSkillOffered.SkillProficiency level) {
        if ("offered".equalsIgnoreCase(type)) {
            offeredRepo.deleteByIdUserIdAndIdSkillId(user.getId(), skill.getId());
            UserSkillOffered entry = UserSkillOffered.builder()
                .id(new UserSkillOffered.UserSkillId(user.getId(), skill.getId()))
                .user(user).skill(skill).level(level)
                .build();
            offeredRepo.save(entry);
        } else {
            wantedRepo.deleteByIdUserIdAndIdSkillId(user.getId(), skill.getId());
            UserSkillWanted entry = UserSkillWanted.builder()
                .id(new UserSkillWanted.UserSkillId(user.getId(), skill.getId()))
                .user(user).skill(skill).level(level)
                .build();
            wantedRepo.save(entry);
        }
    }

    @Override
    @Transactional
    public void removeSkill(String userId, String skillId, String type) {
        if ("offered".equalsIgnoreCase(type)) {
            offeredRepo.deleteByIdUserIdAndIdSkillId(userId, skillId);
        } else {
            wantedRepo.deleteByIdUserIdAndIdSkillId(userId, skillId);
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
