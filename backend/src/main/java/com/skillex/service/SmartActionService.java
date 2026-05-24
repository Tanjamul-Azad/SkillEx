package com.skillex.service;

import com.skillex.dto.dashboard.SmartActionDto;
import com.skillex.repository.ExchangeRepository;
import com.skillex.repository.SessionRepository;
import com.skillex.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SmartActionService {
    private final UserRepository userRepository;
    private final ExchangeRepository exchangeRepository;
    private final SessionRepository sessionRepository;

    @Transactional(readOnly = true)
    public List<SmartActionDto> actionsFor(String userId) {
        var user = userRepository.findById(userId)
            .orElseThrow(() -> new EntityNotFoundException("User not found: " + userId));
        List<SmartActionDto> actions = new ArrayList<>();

        if ((user.getSkillsOffered() == null || user.getSkillsOffered().isEmpty())
            || (user.getSkillsWanted() == null || user.getSkillsWanted().isEmpty())) {
            actions.add(new SmartActionDto("profile-skills", "PROFILE", "Complete your skill profile",
                "Matching improves when SkillEX knows both what you teach and what you want to learn.",
                95, "Update profile", "/settings", userId));
        }
        long pendingExchanges = exchangeRepository.countByRequesterIdOrReceiverIdAndStatus(
            userId, userId, com.skillex.model.Exchange.ExchangeStatus.PENDING);
        if (pendingExchanges > 0) {
            actions.add(new SmartActionDto("pending-exchanges", "EXCHANGE", "Review pending exchange requests",
                "You have open exchange activity waiting for a decision.",
                90, "Open dashboard", "/dashboard#exchange-requests", null));
        }
        long scheduledSessions = sessionRepository.countByUserIdAndStatus(
            userId, com.skillex.model.Session.SessionStatus.SCHEDULED);
        if (scheduledSessions > 0) {
            actions.add(new SmartActionDto("scheduled-sessions", "SESSION", "Prepare for upcoming sessions",
                "Review your exchange topic and join the live room on time.",
                80, "View sessions", "/dashboard", null));
        }
        if (actions.isEmpty()) {
            actions.add(new SmartActionDto("find-match", "MATCH", "Find your next skill match",
                "You are ready to discover a practical two-way exchange.",
                70, "Find match", "/match", null));
        }
        return actions.stream()
            .sorted((a, b) -> Integer.compare(b.priority(), a.priority()))
            .limit(5)
            .toList();
    }
}
