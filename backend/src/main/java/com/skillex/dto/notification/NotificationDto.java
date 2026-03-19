package com.skillex.dto.notification;

import java.time.LocalDateTime;

/** Response DTO for a notification */
public record NotificationDto(
    String id,
    String type,
    String message,
    FromUserRef fromUser,   // null for system notifications
    boolean isRead,
    LocalDateTime createdAt
) {
    public record FromUserRef(String id, String name, String avatar) {}
}
