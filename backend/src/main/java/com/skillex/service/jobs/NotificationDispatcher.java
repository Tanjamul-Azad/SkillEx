package com.skillex.service.jobs;

import com.skillex.model.Notification;
import com.skillex.repository.NotificationRepository;
import com.skillex.service.DtoMapper;
import com.skillex.service.NotificationPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Periodically re-dispatches unread notifications to connected clients.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class NotificationDispatcher {

    private final NotificationRepository notificationRepository;
    private final NotificationPublisher notificationPublisher;
    private final DtoMapper dtoMapper;

    @Scheduled(cron = "${app.jobs.notification-dispatcher.cron:*/30 * * * * *}")
    @Transactional(readOnly = true)
    public void dispatch() {
        List<Notification> unread = notificationRepository.findTop200ByIsReadFalseOrderByCreatedAtAsc();
        for (Notification notification : unread) {
            notificationPublisher.push(notification.getUser().getId(), dtoMapper.toNotification(notification));
        }
        if (!unread.isEmpty()) {
            log.debug("[Scheduler] Notification dispatcher pushed {} unread notifications.", unread.size());
        }
    }
}
