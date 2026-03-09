package com.skillex.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * STOMP over WebSocket configuration.
 *
 * Endpoints:
 *  - /ws          — SockJS fallback endpoint (clients connect here)
 *
 * Prefixes:
 *  - /app         — Client-to-server message destination prefix
 *  - /topic        — Server-to-client broadcast topic (simple in-memory broker)
 *  - /user        — Server-to-specific-user topic (/user/{username}/queue/…)
 *
 * Security:
 *  SecurityConfig permits /ws/** so the HTTP handshake goes through.
 *  After upgrade the JWT is validated in JwtChannelInterceptor.
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
            .setAllowedOriginPatterns("*")
            .withSockJS();
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // In-memory broker for /topic (broadcasts) and /user (point-to-point)
        registry.enableSimpleBroker("/topic", "/user");
        // Client sends messages to /app/…
        registry.setApplicationDestinationPrefixes("/app");
        // Enables /user/{name}/queue/… routing for convertAndSendToUser
        registry.setUserDestinationPrefix("/user");
    }
}
