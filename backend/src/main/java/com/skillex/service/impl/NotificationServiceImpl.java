package com.skillex.service.impl;

import com.skillex.dto.common.PagedResponse;
import com.skillex.dto.notification.NotificationDto;
import com.skillex.model.Notification;
import com.skillex.model.User;
import com.skillex.repository.NotificationRepository;
import com.skillex.repository.UserRepository;
import com.skillex.service.DtoMapper;
import com.skillex.service.NotificationPublisher;
import com.skillex.service.NotificationService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;

@Service
@RequiredArgsConstructor
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final DtoMapper mapper;
    private final NotificationPublisher publisher;

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<NotificationDto> getForUser(String userId, int page, int size) {
        var pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return PagedResponse.of(
            notificationRepository.findByUserId(userId, pageable).map(mapper::toNotification));
    }

    @Override
    @Transactional
    public NotificationDto markRead(String notificationId, String userId) {
        Notification notification = notificationRepository.findById(Objects.requireNonNull(notificationId, "Notification ID must not be null"))
            .orElseThrow(() -> new EntityNotFoundException("Notification not found: " + notificationId));
        String recipientId = Objects.requireNonNull(notification.getUser().getId(), "Recipient ID must not be null");
        if (!recipientId.equals(userId)) {
            throw new AccessDeniedException("This notification does not belong to you.");
        }
        notification.setIsRead(true);
        Notification saved = Objects.requireNonNull(notificationRepository.save(notification), "Saved notification must not be null");
        return mapper.toNotification(saved);
    }

    @Override
    @Transactional
    public void markAllRead(String userId) {
        notificationRepository.markAllReadByUserId(userId);
    }

    @Override
    @Transactional
    public NotificationDto create(String userId, String fromUserId, String type, String message) {
        User user = userRepository.findById(Objects.requireNonNull(userId, "User ID must not be null"))
            .orElseThrow(() -> new EntityNotFoundException("User not found: " + userId));
        User fromUser = fromUserId != null
            ? userRepository.findById(fromUserId).orElse(null)
            : null;

        Notification notification = new Notification();
        notification.setUser(user);
        notification.setFromUser(fromUser);
        notification.setType(Notification.NotificationType.valueOf(type.toUpperCase()));
        notification.setMessage(message);
        notification.setIsRead(false);
        Notification saved = Objects.requireNonNull(notificationRepository.save(notification), "Saved notification must not be null");
        NotificationDto dto = Objects.requireNonNull(mapper.toNotification(saved), "Notification DTO must not be null");
        // Push real-time via WebSocket (non-blocking; falls back gracefully if WS is down)
        publisher.push(Objects.requireNonNull(userId, "User ID must not be null"), dto);
        return dto;
    }
}
