package com.skillex.service;

import com.skillex.dto.moderation.UserRestrictionDto;
import com.skillex.model.UserRestriction;
import com.skillex.repository.UserRestrictionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AccountRestrictionService {
    private final UserRestrictionRepository restrictionRepository;

    @Transactional(readOnly = true)
    public List<UserRestriction> activeRestrictions(String userId) {
        return restrictionRepository.findActiveForUser(
            userId,
            UserRestriction.RestrictionStatus.ACTIVE,
            LocalDateTime.now()
        );
    }

    @Transactional(readOnly = true)
    public List<UserRestrictionDto> getActiveRestrictionDtos(String userId) {
        return activeRestrictions(userId).stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public void assertCanUseAccount(String userId, String action) {
        List<UserRestriction> active = activeRestrictions(userId);
        boolean blocked = active.stream().anyMatch(r ->
            r.getRestrictionType() == UserRestriction.RestrictionType.BAN_ACCOUNT
                || r.getRestrictionType() == UserRestriction.RestrictionType.SUSPEND_ACCOUNT
                || (isPostingAction(action) && r.getRestrictionType() == UserRestriction.RestrictionType.RESTRICT_POSTING)
                || (isMessagingAction(action) && r.getRestrictionType() == UserRestriction.RestrictionType.RESTRICT_MESSAGING)
        );
        if (blocked) {
            throw new AccessDeniedException("Your account is currently restricted for this action. Please check your account status or contact support.");
        }
    }

    @Transactional(readOnly = true)
    public int safetyScore(String userId) {
        List<UserRestriction> active = activeRestrictions(userId);
        if (active.stream().anyMatch(r -> r.getRestrictionType() == UserRestriction.RestrictionType.BAN_ACCOUNT)) return 0;
        if (active.stream().anyMatch(r -> r.getRestrictionType() == UserRestriction.RestrictionType.SUSPEND_ACCOUNT)) return 15;
        if (active.stream().anyMatch(r -> r.getRestrictionType() == UserRestriction.RestrictionType.RESTRICT_POSTING
            || r.getRestrictionType() == UserRestriction.RestrictionType.RESTRICT_MESSAGING)) return 55;
        if (active.stream().anyMatch(r -> r.getRestrictionType() == UserRestriction.RestrictionType.WARN)) return 80;
        return 100;
    }

    private boolean isPostingAction(String action) {
        return action != null && (
            action.equalsIgnoreCase("POSTING")
                || action.equalsIgnoreCase("COMMENTING")
                || action.equalsIgnoreCase("COMMUNITY")
                || action.equalsIgnoreCase("REVIEW")
                || action.equalsIgnoreCase("SKILL")
        );
    }

    private boolean isMessagingAction(String action) {
        return action != null && (
            action.equalsIgnoreCase("MESSAGING")
                || action.equalsIgnoreCase("EXCHANGE")
                || action.equalsIgnoreCase("SESSION")
        );
    }

    private UserRestrictionDto toDto(UserRestriction r) {
        return new UserRestrictionDto(
            r.getId(),
            r.getUser().getId(),
            r.getRestrictionType().name(),
            r.getReason(),
            r.getStatus().name(),
            r.getStartsAt(),
            r.getEndsAt(),
            r.getCreatedAt()
        );
    }
}
