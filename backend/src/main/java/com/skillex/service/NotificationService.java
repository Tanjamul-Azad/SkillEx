package com.skillex.service;

import com.skillex.dto.common.PagedResponse;
import com.skillex.dto.notification.NotificationDto;

/**
 * Contract for user notification management.
 */
public interface NotificationService {

    PagedResponse<NotificationDto> getForUser(String userId, int page, int size);

    NotificationDto markRead(String notificationId, String userId);

    void markAllRead(String userId);

    NotificationDto create(String userId, String fromUserId, String type, String message);
}
