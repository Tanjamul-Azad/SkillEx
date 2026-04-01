package com.skillex.service.impl;

import com.skillex.dto.common.PagedResponse;
import com.skillex.dto.connection.ConnectionDto;
import com.skillex.dto.connection.ConnectionRelationshipDto;
import com.skillex.dto.connection.CreateConnectionRequest;
import com.skillex.dto.connection.UpdateConnectionRequest;
import com.skillex.dto.message.MessageDto;
import com.skillex.model.Connection;
import com.skillex.model.Connection.ConnectionStatus;
import com.skillex.model.User;
import com.skillex.repository.ConnectionRepository;
import com.skillex.repository.UserRepository;
import com.skillex.service.ConnectionService;
import com.skillex.service.DtoMapper;
import com.skillex.service.MessageService;
import com.skillex.service.NotificationService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@SuppressWarnings("null")
@Slf4j
public class ConnectionServiceImpl implements ConnectionService {

    private final ConnectionRepository connectionRepository;
    private final UserRepository userRepository;
    private final DtoMapper mapper;
    private final NotificationService notificationService;
    private final MessageService messageService;
    private final SimpMessagingTemplate messagingTemplate;

    @Override
    @Transactional
    public ConnectionDto create(String requesterId, CreateConnectionRequest req) {
        User requester = findUser(requesterId);
        User receiver = findUser(req.receiverId());

        if (requester.getId().equals(receiver.getId())) {
            throw new IllegalArgumentException("You cannot connect with yourself.");
        }

        Connection existing = connectionRepository.findPairByStatuses(
            requesterId,
            receiver.getId(),
            List.of(ConnectionStatus.PENDING, ConnectionStatus.ACCEPTED),
            PageRequest.of(0, 1)
        ).stream().findFirst().orElse(null);

        if (existing != null) {
            if (existing.getStatus() == ConnectionStatus.ACCEPTED) {
                return mapper.toConnection(existing);
            }
            if (existing.getRequester().getId().equals(requesterId)) {
                return mapper.toConnection(existing);
            }
            throw new IllegalStateException("This user already sent you a connection request. Respond to it instead.");
        }

        Connection connection = new Connection();
        connection.setRequester(requester);
        connection.setReceiver(receiver);
        connection.setMessage(req.message());
        connection.setStatus(ConnectionStatus.PENDING);

        Connection saved = connectionRepository.save(connection);

        notificationService.create(
            receiver.getId(),
            requester.getId(),
            "CONNECTION_REQUEST",
            requester.getName() + " sent you a connection request."
        );

        return mapper.toConnection(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<ConnectionDto> listForUser(String userId, String status, String direction, int page, int size) {
        var pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        String normalizedDirection = direction == null ? "all" : direction.trim().toLowerCase();

        ConnectionStatus statusEnum = null;
        if (status != null && !status.isBlank()) {
            statusEnum = parseStatus(status);
        }

        Page<Connection> pageResult;

        if ("sent".equals(normalizedDirection)) {
            pageResult = statusEnum == null
                ? connectionRepository.findByRequesterId(userId, pageable)
                : connectionRepository.findByRequesterIdAndStatus(userId, statusEnum, pageable);
        } else if ("received".equals(normalizedDirection)) {
            pageResult = statusEnum == null
                ? connectionRepository.findByReceiverId(userId, pageable)
                : connectionRepository.findByReceiverIdAndStatus(userId, statusEnum, pageable);
        } else if ("all".equals(normalizedDirection)) {
            pageResult = statusEnum == null
                ? connectionRepository.findByRequesterIdOrReceiverId(userId, userId, pageable)
                : connectionRepository.findByRequesterIdOrReceiverIdAndStatus(userId, userId, statusEnum, pageable);
        } else {
            throw new IllegalArgumentException("direction must be one of: all, sent, received");
        }

        return PagedResponse.of(pageResult.map(mapper::toConnection));
    }

    @Override
    @Transactional
    public ConnectionDto updateStatus(String connectionId, String actingUserId, UpdateConnectionRequest req) {
        Connection connection = findConnection(connectionId);
        boolean isRequester = connection.getRequester().getId().equals(actingUserId);
        boolean isReceiver = connection.getReceiver().getId().equals(actingUserId);

        if (!isRequester && !isReceiver) {
            throw new AccessDeniedException("You are not a participant in this connection.");
        }

        ConnectionStatus next = parseStatus(req.status());
        ConnectionStatus current = connection.getStatus();

        if (current == next) {
            return mapper.toConnection(connection);
        }

        if (next == ConnectionStatus.ACCEPTED || next == ConnectionStatus.DECLINED) {
            if (!isReceiver) {
                throw new AccessDeniedException("Only the receiver can accept or decline this request.");
            }
            if (current != ConnectionStatus.PENDING) {
                throw new IllegalStateException("Only pending requests can be accepted or declined.");
            }
        }

        if (next == ConnectionStatus.CANCELLED) {
            if (current != ConnectionStatus.PENDING && current != ConnectionStatus.ACCEPTED) {
                throw new IllegalStateException("Only pending or accepted connections can be cancelled.");
            }
        }

        connection.setStatus(next);
        connection.setRespondedAt(LocalDateTime.now());
        Connection saved = connectionRepository.save(connection);

        if (next == ConnectionStatus.ACCEPTED) {
            notificationService.create(
                saved.getRequester().getId(),
                saved.getReceiver().getId(),
                "CONNECTION_ACCEPTED",
                saved.getReceiver().getName() + " accepted your connection request."
            );
            sendAutoConnectionMessage(saved);
        }

        return mapper.toConnection(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public ConnectionRelationshipDto getRelationship(String userId, String targetUserId) {
        if (userId.equals(targetUserId)) {
            return new ConnectionRelationshipDto(targetUserId, "NONE", null, false);
        }

        Connection latest = connectionRepository.findPairHistory(
            userId,
            targetUserId,
            PageRequest.of(0, 1)
        ).stream().findFirst().orElse(null);

        if (latest == null) {
            return new ConnectionRelationshipDto(targetUserId, "NONE", null, false);
        }

        return switch (latest.getStatus()) {
            case ACCEPTED -> new ConnectionRelationshipDto(targetUserId, "CONNECTED", latest.getId(), true);
            case PENDING -> {
                String status = latest.getRequester().getId().equals(userId)
                    ? "PENDING_SENT"
                    : "PENDING_RECEIVED";
                yield new ConnectionRelationshipDto(targetUserId, status, latest.getId(), false);
            }
            default -> new ConnectionRelationshipDto(targetUserId, "NONE", null, false);
        };
    }

    @Override
    @Transactional(readOnly = true)
    public long countIncomingPending(String userId) {
        return connectionRepository.countByReceiverIdAndStatus(userId, ConnectionStatus.PENDING);
    }

    private void sendAutoConnectionMessage(Connection connection) {
        try {
            MessageDto systemMessage = messageService.sendMessage(
                connection.getReceiver().getId(),
                connection.getRequester().getId(),
                "You are now connected on SkillEX. Say hello and plan your first skill exchange.",
                "TEXT",
                null
            );
            messagingTemplate.convertAndSendToUser(connection.getRequester().getId(), "/queue/messages", systemMessage);
            messagingTemplate.convertAndSendToUser(connection.getReceiver().getId(), "/queue/messages", systemMessage);
        } catch (Exception ex) {
            log.warn("Could not send auto connection message for {}: {}", connection.getId(), ex.getMessage());
        }
    }

    private ConnectionStatus parseStatus(String status) {
        try {
            return ConnectionStatus.valueOf(status.toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Invalid connection status: " + status);
        }
    }

    private User findUser(String id) {
        return userRepository.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("User not found: " + id));
    }

    private Connection findConnection(String id) {
        return connectionRepository.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("Connection not found: " + id));
    }
}
