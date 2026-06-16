package com.skillex.config;

import com.skillex.repository.SessionRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SessionStompAuthorizationInterceptorTest {

    @Mock private SessionRepository sessionRepository;
    @InjectMocks private SessionStompAuthorizationInterceptor interceptor;

    private final MessageChannel channel = mock(MessageChannel.class);

    private Message<byte[]> frame(StompCommand command, String destination, String userId) {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(command);
        if (destination != null) {
            accessor.setDestination(destination);
        }
        if (userId != null) {
            accessor.setUser(new UsernamePasswordAuthenticationToken(userId, null));
        }
        return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
    }

    @Test
    void allowsParticipantToSubscribeToSessionTopic() {
        when(sessionRepository.isParticipant("s1", "u1")).thenReturn(true);

        Message<?> result = interceptor.preSend(
            frame(StompCommand.SUBSCRIBE, "/topic/session/s1/transcript", "u1"), channel);

        assertNotNull(result);
    }

    @Test
    void blocksNonParticipantFromSubscribingToSessionTopic() {
        when(sessionRepository.isParticipant("s1", "intruder")).thenReturn(false);

        assertThrows(AccessDeniedException.class, () ->
            interceptor.preSend(frame(StompCommand.SUBSCRIBE, "/topic/session/s1/transcript", "intruder"), channel));
    }

    @Test
    void blocksNonParticipantFromSendingToSessionAppDestination() {
        when(sessionRepository.isParticipant("s1", "intruder")).thenReturn(false);

        assertThrows(AccessDeniedException.class, () ->
            interceptor.preSend(frame(StompCommand.SEND, "/app/session/s1/shared-notes", "intruder"), channel));
    }

    @Test
    void blocksNonParticipantFromPublishingDirectlyToSessionTopic() {
        when(sessionRepository.isParticipant("s1", "intruder")).thenReturn(false);

        // chat / whiteboard / raise-hand are client->broker relays straight to /topic.
        assertThrows(AccessDeniedException.class, () ->
            interceptor.preSend(frame(StompCommand.SEND, "/topic/session/s1/chat", "intruder"), channel));
    }

    @Test
    void rejectsUnauthenticatedAccessToSessionDestination() {
        assertThrows(AccessDeniedException.class, () ->
            interceptor.preSend(frame(StompCommand.SUBSCRIBE, "/topic/session/s1/transcript", null), channel));
    }

    @Test
    void ignoresNonSessionDestinations() {
        Message<?> userQueue = interceptor.preSend(
            frame(StompCommand.SUBSCRIBE, "/user/queue/messages", "u1"), channel);
        Message<?> chatSend = interceptor.preSend(
            frame(StompCommand.SEND, "/app/chat.send", "u1"), channel);

        assertNotNull(userQueue);
        assertNotNull(chatSend);
        verify(sessionRepository, never()).isParticipant(org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.anyString());
    }

    @Test
    void ignoresNonSubscribeSendCommands() {
        lenient().when(sessionRepository.isParticipant(org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.anyString())).thenReturn(false);

        Message<?> result = interceptor.preSend(
            frame(StompCommand.CONNECT, "/topic/session/s1/transcript", "u1"), channel);

        assertNotNull(result);
        verify(sessionRepository, never()).isParticipant(org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.anyString());
    }
}
