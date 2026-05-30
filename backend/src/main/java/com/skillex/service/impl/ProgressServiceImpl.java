package com.skillex.service.impl;

import com.skillex.dto.common.PagedResponse;
import com.skillex.dto.progress.UserProgressDto;
import com.skillex.dto.progress.XpEventDto;
import com.skillex.model.User;
import com.skillex.model.UserProgress;
import com.skillex.model.XpEvent;
import com.skillex.repository.UserProgressRepository;
import com.skillex.repository.UserRepository;
import com.skillex.repository.XpEventRepository;
import com.skillex.service.ProgressService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Service
@RequiredArgsConstructor
public class ProgressServiceImpl implements ProgressService {

    private static final int XP_PER_LEVEL = 100;

    private final UserProgressRepository progressRepository;
    private final XpEventRepository xpEventRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional
    public UserProgressDto getProgress(String userId) {
        User user = findUser(userId);
        return toDto(ensureProgress(user));
    }

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<XpEventDto> getXpEvents(String userId, int page, int size) {
        if (!userRepository.existsById(userId)) {
            throw new EntityNotFoundException("User not found: " + userId);
        }
        return PagedResponse.of(xpEventRepository
            .findByUserIdOrderByOccurredAtDesc(userId, PageRequest.of(page, size))
            .map(this::toEventDto));
    }

    @Override
    @Transactional
    public void awardXp(String userId, String sourceType, String sourceId, int xpDelta, String reason) {
        if (xpDelta <= 0 || sourceType == null || sourceType.isBlank() || sourceId == null || sourceId.isBlank()) {
            return;
        }
        User user = userRepository.findByIdForUpdate(userId)
            .orElseThrow(() -> new EntityNotFoundException("User not found: " + userId));
        if (xpEventRepository.existsByUserIdAndSourceTypeAndSourceId(userId, sourceType, sourceId)) {
            return;
        }

        UserProgress progress = ensureProgress(user);
        LocalDate today = LocalDate.now();
        LocalDate last = progress.getLastActivityDate();
        if (last == null) {
            progress.setCurrentStreakDays(1);
        } else if (last.equals(today.minusDays(1))) {
            progress.setCurrentStreakDays(progress.getCurrentStreakDays() + 1);
        } else if (!last.equals(today)) {
            progress.setCurrentStreakDays(1);
        }
        progress.setLastActivityDate(today);
        progress.setLongestStreakDays(Math.max(progress.getLongestStreakDays(), progress.getCurrentStreakDays()));
        progress.setTotalXp(progress.getTotalXp() + xpDelta);
        progress.setCurrentLevel(levelFor(progress.getTotalXp()));
        progressRepository.save(progress);

        xpEventRepository.save(XpEvent.builder()
            .user(user)
            .sourceType(sourceType)
            .sourceId(sourceId)
            .xpDelta(xpDelta)
            .reason(reason)
            .build());
    }

    private UserProgress ensureProgress(User user) {
        return progressRepository.findByUserIdForUpdate(user.getId())
            .orElseGet(() -> progressRepository.save(UserProgress.builder()
                .user(user)
                .totalXp(Math.max(0, user.getSkillexScore() == null ? 0 : user.getSkillexScore() / 5))
                .currentLevel(levelFor(Math.max(0, user.getSkillexScore() == null ? 0 : user.getSkillexScore() / 5)))
                .build()));
    }

    private int levelFor(int totalXp) {
        return Math.max(1, (totalXp / XP_PER_LEVEL) + 1);
    }

    private User findUser(String id) {
        return userRepository.findById(id).orElseThrow(() -> new EntityNotFoundException("User not found: " + id));
    }

    private UserProgressDto toDto(UserProgress progress) {
        int xpIntoLevel = progress.getTotalXp() % XP_PER_LEVEL;
        return new UserProgressDto(
            progress.getUser().getId(),
            progress.getTotalXp(),
            progress.getCurrentLevel(),
            xpIntoLevel,
            XP_PER_LEVEL,
            Math.min(100, xpIntoLevel),
            progress.getCurrentStreakDays(),
            progress.getLongestStreakDays(),
            progress.getWeeklyGoal(),
            progress.getLastActivityDate(),
            progress.getUpdatedAt()
        );
    }

    private XpEventDto toEventDto(XpEvent event) {
        return new XpEventDto(
            event.getId(),
            event.getSourceType(),
            event.getSourceId(),
            event.getXpDelta(),
            event.getReason(),
            event.getOccurredAt()
        );
    }
}
