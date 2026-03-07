package com.skillex.service.impl;

import com.skillex.dto.common.PagedResponse;
import com.skillex.dto.notification.NotificationDto;
import com.skillex.model.Notification;
import com.skillex.model.User;
import com.skillex.repository.NotificationRepository;
import com.skillex.repository.UserRepository;
import com.skillex.service.DtoMapper;
import com.skillex.service.NotificationService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final DtoMapper mapper;

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
        Notification notification = notificationRepository.findById(notificationId)
            .orElseThrow(() -> new EntityNotFoundException("Notification not found: " + notificationId));
        if (!notification.getUser().getId().equals(userId)) {
            throw new AccessDeniedException("This notification does not belong to you.");
        }
        notification.setIsRead(true);
        return mapper.toNotification(notificationRepository.save(notification));
    }

    @Override
    @Transactional
    public void markAllRead(String userId) {
        notificationRepository.markAllReadByUserId(userId);
    }

    @Override
    @Transactional
    public NotificationDto create(String userId, String fromUserId, String type, String message) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new EntityNotFoundException("User not found: " + userId));
        User fromUser = fromUserId != null
            ? userRepository.findById(fromUserId).orElse(null)
            : null;

        Notification notification = new Notification();
        notification.setId(UUID.randomUUID().toString());
        notification.setUser(user);
        notification.setFromUser(fromUser);
        notification.setType(Notification.NotificationType.valueOf(type.toUpperCase()));
        notification.setMessage(message);
        notification.setIsRead(false);
        return mapper.toNotification(notificationRepository.save(notification));
    }
}
