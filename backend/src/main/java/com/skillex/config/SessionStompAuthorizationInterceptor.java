package com.skillex.config;

import com.skillex.repository.SessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.lang.NonNull;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;

import java.security.Principal;

/**
 * Enforces per-session authorization on WebSocket session-room destinations.
 *
 * <p>The connect-time {@link JwtChannelInterceptor} authenticates the STOMP session,
 * but the in-memory broker would otherwise let any authenticated client SUBSCRIBE to
 * — or SEND to — another session's {@code /topic/session/{id}/**} feed (transcript,
 * presence, shared notes, chat, whiteboard, raise-hand). This interceptor closes that
 * gap by checking that the connected user is a participant (teacher or learner) of the
 * session referenced in the destination.</p>
 *
 * <p>Only client-originated SUBSCRIBE/SEND frames pass through the client inbound
 * channel; server-side {@code convertAndSend} broadcasts use the broker channel and are
 * not affected. Non-session destinations ({@code /app/chat.send}, user queues, …) are
 * left untouched.</p>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class SessionStompAuthorizationInterceptor implements ChannelInterceptor {

    private static final String TOPIC_SESSION_PREFIX = "/topic/session/";
    private static final String APP_SESSION_PREFIX = "/app/session/";

    private final SessionRepository sessionRepository;

    @Override
    public Message<?> preSend(@NonNull Message<?> message, @NonNull MessageChannel channel) {
        StompHeaderAccessor accessor =
            MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null) {
            return message;
        }

        StompCommand command = accessor.getCommand();
        if (command != StompCommand.SUBSCRIBE && command != StompCommand.SEND) {
            return message;
        }

        String sessionId = extractSessionId(accessor.getDestination());
        if (sessionId == null) {
            return message; // not a session-room destination
        }

        String userId = currentUserId(accessor);
        if (userId == null) {
            throw new AccessDeniedException("Authentication required for session rooms.");
        }

        if (!sessionRepository.isParticipant(sessionId, userId)) {
            log.warn("[ws] Blocked {} to {} — user {} is not a participant of session {}",
                command, accessor.getDestination(), userId, sessionId);
            throw new AccessDeniedException("You are not a participant in this session.");
        }

        return message;
    }

    /** Returns the session id embedded in a session-room destination, or null if it is not one. */
    private String extractSessionId(String destination) {
        if (destination == null) {
            return null;
        }
        String remainder;
        if (destination.startsWith(TOPIC_SESSION_PREFIX)) {
            remainder = destination.substring(TOPIC_SESSION_PREFIX.length());
        } else if (destination.startsWith(APP_SESSION_PREFIX)) {
            remainder = destination.substring(APP_SESSION_PREFIX.length());
        } else {
            return null;
        }
        int slash = remainder.indexOf('/');
        String id = slash >= 0 ? remainder.substring(0, slash) : remainder;
        return id.isBlank() ? null : id;
    }

    private String currentUserId(StompHeaderAccessor accessor) {
        Principal user = accessor.getUser();
        return user == null ? null : user.getName();
    }
}
