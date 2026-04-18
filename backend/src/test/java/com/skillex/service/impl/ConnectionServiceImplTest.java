package com.skillex.service.impl;

import com.skillex.dto.connection.ConnectionDto;
import com.skillex.dto.connection.ConnectionRelationshipDto;
import com.skillex.dto.connection.CreateConnectionRequest;
import com.skillex.dto.connection.UpdateConnectionRequest;
import com.skillex.model.Connection;
import com.skillex.model.Connection.ConnectionStatus;
import com.skillex.model.User;
import com.skillex.repository.ConnectionRepository;
import com.skillex.repository.UserRepository;
import com.skillex.service.DtoMapper;
import com.skillex.service.MessageService;
import com.skillex.service.NotificationService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.access.AccessDeniedException;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings("null")
class ConnectionServiceImplTest {

    @Mock private ConnectionRepository connectionRepository;
    @Mock private UserRepository userRepository;
    @Mock private DtoMapper mapper;
    @Mock private NotificationService notificationService;
    @Mock private MessageService messageService;
    @Mock private SimpMessagingTemplate messagingTemplate;

    @InjectMocks
    private ConnectionServiceImpl connectionService;

    @Test
    void create_shouldReturnExistingPendingWhenDuplicateSentBySameRequester() {
        User requester = user("u-req", "Requester");
        User receiver = user("u-rec", "Receiver");

        Connection existing = new Connection();
        existing.setId("c-1");
        existing.setRequester(requester);
        existing.setReceiver(receiver);
        existing.setStatus(ConnectionStatus.PENDING);

        ConnectionDto mapped = new ConnectionDto("c-1", null, null, "hello", "PENDING", null, null);

        when(userRepository.findById(requester.getId())).thenReturn(Optional.of(requester));
        when(userRepository.findById(receiver.getId())).thenReturn(Optional.of(receiver));
        when(connectionRepository.findPairByStatuses(eq(requester.getId()), eq(receiver.getId()), any(), any()))
            .thenReturn(List.of(existing));
        when(mapper.toConnection(existing)).thenReturn(mapped);

        ConnectionDto result = connectionService.create(
            requester.getId(),
            new CreateConnectionRequest(receiver.getId(), "hello")
        );

        assertEquals("c-1", result.id());
        verify(connectionRepository, never()).save(any(Connection.class));
        verify(notificationService, never()).create(any(), any(), any(), any());
    }

    @Test
    void updateStatus_shouldRejectAcceptWhenActorIsRequester() {
        User requester = user("u-req", "Requester");
        User receiver = user("u-rec", "Receiver");

        Connection pending = new Connection();
        pending.setId("c-2");
        pending.setRequester(requester);
        pending.setReceiver(receiver);
        pending.setStatus(ConnectionStatus.PENDING);

        when(connectionRepository.findById("c-2")).thenReturn(Optional.of(pending));

        assertThrows(AccessDeniedException.class, () ->
            connectionService.updateStatus("c-2", requester.getId(), new UpdateConnectionRequest("ACCEPTED"))
        );

        verify(connectionRepository, never()).save(any(Connection.class));
    }

    @Test
    void getRelationship_shouldReturnNoneWhenNoHistoryExists() {
        when(connectionRepository.findPairHistory(eq("u-a"), eq("u-b"), any())).thenReturn(List.of());

        ConnectionRelationshipDto result = connectionService.getRelationship("u-a", "u-b");

        assertEquals("NONE", result.status());
        assertFalse(result.canMessage());
    }

    @Test
    void getRelationship_shouldReturnPendingSentWhenViewerIsRequester() {
        Connection pending = new Connection();
        pending.setId("c-3");
        pending.setRequester(user("u-a", "A"));
        pending.setReceiver(user("u-b", "B"));
        pending.setStatus(ConnectionStatus.PENDING);

        when(connectionRepository.findPairHistory(eq("u-a"), eq("u-b"), any())).thenReturn(List.of(pending));

        ConnectionRelationshipDto result = connectionService.getRelationship("u-a", "u-b");

        assertEquals("PENDING_SENT", result.status());
        assertEquals("c-3", result.connectionId());
        assertFalse(result.canMessage());
    }

    @Test
    void getRelationship_shouldReturnPendingReceivedWhenViewerIsReceiver() {
        Connection pending = new Connection();
        pending.setId("c-4");
        pending.setRequester(user("u-b", "B"));
        pending.setReceiver(user("u-a", "A"));
        pending.setStatus(ConnectionStatus.PENDING);

        when(connectionRepository.findPairHistory(eq("u-a"), eq("u-b"), any())).thenReturn(List.of(pending));

        ConnectionRelationshipDto result = connectionService.getRelationship("u-a", "u-b");

        assertEquals("PENDING_RECEIVED", result.status());
        assertEquals("c-4", result.connectionId());
        assertFalse(result.canMessage());
    }

    @Test
    void getRelationship_shouldReturnConnectedForAcceptedConnection() {
        Connection accepted = new Connection();
        accepted.setId("c-5");
        accepted.setRequester(user("u-a", "A"));
        accepted.setReceiver(user("u-b", "B"));
        accepted.setStatus(ConnectionStatus.ACCEPTED);

        when(connectionRepository.findPairHistory(eq("u-a"), eq("u-b"), any())).thenReturn(List.of(accepted));

        ConnectionRelationshipDto result = connectionService.getRelationship("u-a", "u-b");

        assertEquals("CONNECTED", result.status());
        assertEquals("c-5", result.connectionId());
        assertTrue(result.canMessage());
    }

    private User user(String id, String name) {
        User user = new User();
        user.setId(id);
        user.setName(name);
        user.setUsername(name.toLowerCase());
        user.setEmail(id + "@example.com");
        user.setPasswordHash("hash");
        return user;
    }
}
