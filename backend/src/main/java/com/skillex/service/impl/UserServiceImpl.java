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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

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
    @Transactional(readOnly = true)
    public UserSkillsDto getSkills(String userId) {
        UserProfileDto profile = getProfile(userId);
        return new UserSkillsDto(profile.skillsOffered(), profile.skillsWanted());
    }

    @Override
    @Transactional
    public UserProfileDto updateProfile(String userId, UpdateProfileRequest req) {
        User user = findUserById(userId);
        if (req.name()       != null) user.setName(req.name());
        if (req.username() != null) {
            String normalizedUsername = normalizeUsername(req.username());
            if (!normalizedUsername.equalsIgnoreCase(user.getUsername())
                && userRepository.existsByUsernameIgnoreCase(normalizedUsername)) {
                throw new IllegalArgumentException("Username is already in use.");
            }
            user.setUsername(normalizedUsername);
        }
        if (req.university() != null) user.setUniversity(req.university());
        if (req.location()   != null) user.setLocation(req.location());
        if (req.bio()        != null) user.setBio(req.bio());
        if (req.teachIntentText() != null) user.setTeachIntentText(req.teachIntentText().trim());
        if (req.learnIntentText() != null) user.setLearnIntentText(req.learnIntentText().trim());
        if (req.connectionsPublic() != null) user.setConnectionsPublic(req.connectionsPublic());
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
    public PagedResponse<UserSearchResultDto> searchUsers(String viewerId, String query, int page, int size) {
        User viewer = findUserById(viewerId);
        Set<String> viewerOffered = skillIdSet(viewer.getSkillsOffered());
        Set<String> viewerWanted = skillIdSet(viewer.getSkillsWanted());

        String normalizedQuery = query == null ? null : query.trim();
        if (normalizedQuery != null && normalizedQuery.isEmpty()) {
            normalizedQuery = null;
        }

        PageRequest pageable = PageRequest.of(page, size, Sort.by("skillexScore").descending());
        Page<UserRepository.UserSearchCardProjection> results =
            userRepository.searchUserCards(viewerId, normalizedQuery, pageable);

        List<String> candidateIds = results.getContent().stream()
            .map(UserRepository.UserSearchCardProjection::getId)
            .toList();

        List<UserSkillOffered> offeredRows = candidateIds.isEmpty()
            ? List.of()
            : offeredRepo.findByIdUserIdIn(candidateIds);
        List<UserSkillWanted> wantedRows = candidateIds.isEmpty()
            ? List.of()
            : wantedRepo.findByIdUserIdIn(candidateIds);

        Map<String, Set<String>> offeredSkillIdsByUser = offeredRows.stream()
            .collect(Collectors.groupingBy(
                row -> row.getId().getUserId(),
                Collectors.mapping(row -> row.getSkill().getId(), Collectors.toCollection(LinkedHashSet::new))
            ));

        Map<String, Set<String>> wantedSkillIdsByUser = wantedRows.stream()
            .collect(Collectors.groupingBy(
                row -> row.getId().getUserId(),
                Collectors.mapping(row -> row.getSkill().getId(), Collectors.toCollection(LinkedHashSet::new))
            ));

        Map<String, List<String>> offeredSkillNamesByUser = offeredRows.stream()
            .collect(Collectors.groupingBy(
                row -> row.getId().getUserId(),
                Collectors.collectingAndThen(
                    Collectors.mapping(row -> row.getSkill().getName(), Collectors.toCollection(LinkedHashSet::new)),
                    set -> set.stream().limit(3).toList()
                )
            ));

        Map<String, List<String>> wantedSkillNamesByUser = wantedRows.stream()
            .collect(Collectors.groupingBy(
                row -> row.getId().getUserId(),
                Collectors.collectingAndThen(
                    Collectors.mapping(row -> row.getSkill().getName(), Collectors.toCollection(LinkedHashSet::new)),
                    set -> set.stream().limit(3).toList()
                )
            ));

        List<UserSearchResultDto> content = results.getContent().stream()
            .map(candidate -> {
                String candidateId = candidate.getId();
                Set<String> candidateOffered = offeredSkillIdsByUser.getOrDefault(candidateId, Set.of());
                Set<String> candidateWanted = wantedSkillIdsByUser.getOrDefault(candidateId, Set.of());

                return new UserSearchResultDto(
                    candidateId,
                    candidate.getName(),
                    candidate.getUsername(),
                    candidate.getAvatar(),
                    candidate.getUniversity(),
                    safeInt(candidate.getSkillexScore()),
                    candidate.getRating(),
                    safeInt(candidate.getSessionsCompleted()),
                    overlapMatchPercent(viewerOffered, viewerWanted, candidateOffered, candidateWanted),
                    Boolean.TRUE.equals(candidate.getIsOnline()),
                    offeredSkillNamesByUser.getOrDefault(candidateId, List.of()),
                    wantedSkillNamesByUser.getOrDefault(candidateId, List.of())
                );
            })
            .toList();

        return new PagedResponse<>(
            content,
            results.getNumber(),
            results.getSize(),
            results.getTotalElements(),
            results.getTotalPages(),
            results.isLast()
        );
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

    private String normalizeUsername(String rawUsername) {
        String normalized = rawUsername == null ? "" : rawUsername.trim().toLowerCase(Locale.ROOT);
        if (normalized.startsWith("@")) {
            normalized = normalized.substring(1);
        }
        normalized = normalized.replaceAll("[^a-z0-9_]", "_");
        normalized = normalized.replaceAll("_+", "_");
        if (normalized.length() < 3 || normalized.length() > 50) {
            throw new IllegalArgumentException("Username must be 3-50 characters and use letters, numbers, or underscores.");
        }
        return normalized;
    }

    private Set<String> skillIdSet(List<Skill> skills) {
        if (skills == null || skills.isEmpty()) {
            return Set.of();
        }
        return skills.stream()
            .map(Skill::getId)
            .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private int overlapMatchPercent(
        Set<String> viewerOffered,
        Set<String> viewerWanted,
        Set<String> candidateOffered,
        Set<String> candidateWanted
    ) {
        int teachMatches = intersectCount(viewerWanted, candidateOffered);
        int learnMatches = intersectCount(viewerOffered, candidateWanted);

        int denominator = Math.max(1, viewerWanted.size() + viewerOffered.size());
        return Math.min(100, (int) Math.round(((teachMatches + learnMatches) * 100.0) / denominator));
    }

    private int intersectCount(Set<String> left, Set<String> right) {
        if (left.isEmpty() || right.isEmpty()) {
            return 0;
        }
        int count = 0;
        for (String value : left) {
            if (right.contains(value)) {
                count++;
            }
        }
        return count;
    }

    private int safeInt(Integer value) {
        return value == null ? 0 : value;
    }
}
