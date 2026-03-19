package com.skillex.service.impl;

import com.skillex.dto.dashboard.DashboardStatsDto;
import com.skillex.model.Exchange;
import com.skillex.model.Session;
import com.skillex.model.Skill;
import com.skillex.model.User;
import com.skillex.repository.*;
import com.skillex.service.DashboardService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@SuppressWarnings("null")
public class DashboardServiceImpl implements DashboardService {

    private final UserRepository userRepository;
    private final ExchangeRepository exchangeRepository;
    private final SessionRepository sessionRepository;

    @Override
    @Transactional(readOnly = true)
    public DashboardStatsDto getStats(String userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new EntityNotFoundException("User not found: " + userId));

        long pendingExchanges = exchangeRepository
            .countByRequesterIdOrReceiverIdAndStatus(userId, userId, Exchange.ExchangeStatus.PENDING);
        long activeExchanges  = exchangeRepository
            .countByRequesterIdOrReceiverIdAndStatus(userId, userId, Exchange.ExchangeStatus.ACCEPTED);
        long sessionsCompleted = sessionRepository
            .countByUserIdAndStatus(userId, Session.SessionStatus.COMPLETED);

        // Recent activity — last 5 exchanges involving the user
        var recentExchanges = exchangeRepository
            .findByRequesterIdOrReceiverId(userId, userId, PageRequest.of(0, 5, org.springframework.data.domain.Sort.by("createdAt").descending()))
            .getContent();

        List<DashboardStatsDto.ActivityItem> recentActivity = new ArrayList<>();
        for (Exchange ex : recentExchanges) {
            String other = ex.getRequester().getId().equals(userId)
                ? ex.getReceiver().getName()
                : ex.getRequester().getName();
            Skill offeredSkill = ex.getOfferedSkill();
            String skillName = offeredSkill != null ? offeredSkill.getName() : "skill";
            String description = "Exchange with " + other + " – " + skillName;
            recentActivity.add(new DashboardStatsDto.ActivityItem(
                "EXCHANGE", description, ex.getCreatedAt()));
        }

        return new DashboardStatsDto(
            (int) sessionsCompleted,
            user.getSkillexScore() != null ? user.getSkillexScore() : 0,
            user.getRating() != null ? user.getRating() : java.math.BigDecimal.ZERO,
            pendingExchanges,
            activeExchanges,
            recentActivity
        );
    }
}
