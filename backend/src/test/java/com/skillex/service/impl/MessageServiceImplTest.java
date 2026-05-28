package com.skillex.service.impl;

import com.skillex.dto.message.MessageDto;
import com.skillex.model.Connection;
import com.skillex.model.Exchange;
import com.skillex.model.Message;
import com.skillex.model.User;
import com.skillex.repository.ConnectionRepository;
import com.skillex.repository.ExchangeRepository;
import com.skillex.repository.MessageRepository;
import com.skillex.repository.UserRepository;
import com.skillex.service.AccountRestrictionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MessageServiceImplTest {

    @Mock private MessageRepository messageRepository;
    @Mock private UserRepository userRepository;
    @Mock private ConnectionRepository connectionRepository;
    @Mock private ExchangeRepository exchangeRepository;
    @Mock private AccountRestrictionService restrictionService;

    private MessageServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new MessageServiceImpl(
            messageRepository,
            userRepository,
            connectionRepository,
            exchangeRepository,
            restrictionService
        );
    }

    @Test
    void sendMessage_rejectsUsersWithoutAcceptedRelationship() {
        User sender = user("sender");
        User receiver = user("receiver");
        when(userRepository.findById(sender.getId())).thenReturn(Optional.of(sender));
        when(userRepository.findById(receiver.getId())).thenReturn(Optional.of(receiver));
        when(connectionRepository.findPairByStatuses(eq(sender.getId()), eq(receiver.getId()), any(), any()))
            .thenReturn(List.of());
        when(exchangeRepository.findPairHistory(eq(sender.getId()), eq(receiver.getId()), any()))
            .thenReturn(List.of());

        assertThrows(AccessDeniedException.class, () ->
            service.sendMessage(sender.getId(), receiver.getId(), "hello", "TEXT", null)
        );

        verify(messageRepository, never()).save(any(Message.class));
    }

    @Test
    void sendMessage_allowsAcceptedConnection() {
        User sender = user("sender");
        User receiver = user("receiver");
        Connection connection = new Connection();
        connection.setStatus(Connection.ConnectionStatus.ACCEPTED);

        when(userRepository.findById(sender.getId())).thenReturn(Optional.of(sender));
        when(userRepository.findById(receiver.getId())).thenReturn(Optional.of(receiver));
        when(connectionRepository.findPairByStatuses(eq(sender.getId()), eq(receiver.getId()), any(), any()))
            .thenReturn(List.of(connection));
        when(messageRepository.save(any(Message.class))).thenAnswer(invocation -> {
            Message message = invocation.getArgument(0);
            message.setId("message-1");
            return message;
        });

        MessageDto result = service.sendMessage(sender.getId(), receiver.getId(), "hello", "TEXT", null);

        assertEquals("message-1", result.id());
        assertEquals(sender.getId(), result.senderId());
        assertEquals(receiver.getId(), result.receiverId());
    }

    @Test
    void sendMessage_allowsAcceptedExchangeWithoutConnection() {
        User sender = user("sender");
        User receiver = user("receiver");
        Exchange exchange = new Exchange();
        exchange.setStatus(Exchange.ExchangeStatus.ACCEPTED);

        when(userRepository.findById(sender.getId())).thenReturn(Optional.of(sender));
        when(userRepository.findById(receiver.getId())).thenReturn(Optional.of(receiver));
        when(connectionRepository.findPairByStatuses(eq(sender.getId()), eq(receiver.getId()), any(), any()))
            .thenReturn(List.of());
        when(exchangeRepository.findPairHistory(eq(sender.getId()), eq(receiver.getId()), any()))
            .thenReturn(List.of(exchange));
        when(messageRepository.save(any(Message.class))).thenAnswer(invocation -> {
            Message message = invocation.getArgument(0);
            message.setId("message-2");
            return message;
        });

        MessageDto result = service.sendMessage(sender.getId(), receiver.getId(), "hello", "TEXT", null);

        assertEquals("message-2", result.id());
    }

    @Test
    void sendMessage_rejectsSelfMessaging() {
        assertThrows(IllegalArgumentException.class, () ->
            service.sendMessage("sender", "sender", "hello", "TEXT", null)
        );
        verify(messageRepository, never()).save(any(Message.class));
    }

    private static User user(String id) {
        User user = new User();
        user.setId(id);
        user.setName(id);
        user.setEmail(id + "@example.com");
        user.setUsername(id);
        return user;
    }
}
