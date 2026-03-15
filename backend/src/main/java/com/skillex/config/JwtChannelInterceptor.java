package com.skillex.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.lang.NonNull;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Component;

import java.util.Collections;

/**
 * STOMP channel interceptor that validates the JWT on every CONNECT frame
 * and sets the authenticated {@link java.security.Principal} on the session.
 *
 * The token is expected in the STOMP {@code Authorization} header:
 *   {@code Authorization: Bearer <jwt>}
 *
 * Once connected, subsequent frames (SEND, SUBSCRIBE) inherit the principal
 * from the STOMP session — no per-frame re-validation needed.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class JwtChannelInterceptor implements ChannelInterceptor {

    private final JwtUtil jwtUtil;

    @Override
    public Message<?> preSend(@NonNull Message<?> message, @NonNull MessageChannel channel) {
        StompHeaderAccessor accessor =
            MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor == null) return message;

        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            String authHeader = accessor.getFirstNativeHeader("Authorization");
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                String token = authHeader.substring(7);
                try {
                    String userId = jwtUtil.extractUserId(token);
                    // Set the authenticated principal — Spring uses this for
                    // convertAndSendToUser routing and Principal injection in @MessageMapping
                    accessor.setUser(
                        new UsernamePasswordAuthenticationToken(userId, null, Collections.emptyList())
                    );
                } catch (Exception ex) {
                    log.warn("[ws] JWT validation failed on CONNECT: {}", ex.getMessage());
                    // Reject the connection by throwing (Spring will close the WS)
                    throw new org.springframework.security.access.AccessDeniedException(
                        "Invalid or expired token");
                }
            } else {
                log.warn("[ws] CONNECT received without Authorization header — rejecting");
                throw new org.springframework.security.access.AccessDeniedException(
                    "Authorization header missing");
            }
        }

        return message;
    }
}
