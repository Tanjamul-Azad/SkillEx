package com.skillex.service;

import com.skillex.dto.notification.NotificationDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.lang.NonNull;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

/**
 * Pushes real-time notifications to connected WebSocket clients.
 *
 * Each user subscribes to `/user/{userId}/queue/notifications` on the frontend.
 * When a new notification is created for a user, this publisher sends it
 * directly to that user's private queue.
 *
 * This class is separate from NotificationServiceImpl to keep a clean
 * single-responsibility boundary.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationPublisher {

    private final SimpMessagingTemplate messagingTemplate;

    /**
     * Pushes a notification DTO to the target user's private WebSocket queue.
     *
     * @param userId  the recipient's ID (used as the WebSocket user destination)
     * @param dto     the notification to deliver in real-time
     */
    public void push(@NonNull String userId, @NonNull NotificationDto dto) {
        try {
            messagingTemplate.convertAndSendToUser(
                userId,
                "/queue/notifications",
                dto
            );
        } catch (Exception ex) {
            // Non-critical — REST polling still works if WebSocket is down
            log.warn("[ws] Failed to push notification to user {}: {}", userId, ex.getMessage());
        }
    }
}
