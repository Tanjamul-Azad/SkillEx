package com.skillex.service.jobs;

import com.skillex.model.Session;
import com.skillex.repository.SessionRepository;
import com.skillex.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Cancels proposed sessions if nobody accepts within a grace window.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class SessionAutoCanceller {

    private final SessionRepository sessionRepository;
    private final NotificationService notificationService;

    @Value("${app.jobs.session-auto-cancel.grace-mins:30}")
    private long graceMins;

    @Scheduled(cron = "${app.jobs.session-auto-cancel.cron:0 */5 * * * *}")
    @Transactional
    public void autoCancelStaleProposals() {
        if (graceMins <= 0) {
            return;
        }

        LocalDateTime cutoff = LocalDateTime.now().minusMinutes(graceMins);
        List<Session> stale = sessionRepository.findByStatusAndUpdatedAtBefore(
            Session.SessionStatus.PROPOSED,
            cutoff
        );

        if (stale.isEmpty()) {
            return;
        }

        for (Session session : stale) {
            session.setStatus(Session.SessionStatus.CANCELLED);
        }
        sessionRepository.saveAll(stale);

        for (Session session : stale) {
            notifyNoShow(session);
        }

        log.info("[Scheduler] Auto-cancelled {} proposed sessions after {} minutes.", stale.size(), graceMins);
    }

    private void notifyNoShow(Session session) {
        String skillName = session.getSkill() != null ? session.getSkill().getName() : "skill exchange";
        String message = "Session proposal for " + skillName + " expired after " + graceMins + " minutes with no acceptance.";

        try {
            notificationService.create(session.getTeacher().getId(), null, "SYSTEM_UPDATE", message);
        } catch (Exception e) {
            log.debug("[Scheduler] Failed to notify teacher for session {}", session.getId(), e);
        }

        try {
            notificationService.create(session.getLearner().getId(), null, "SYSTEM_UPDATE", message);
        } catch (Exception e) {
            log.debug("[Scheduler] Failed to notify learner for session {}", session.getId(), e);
        }
    }
}
