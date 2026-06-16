package com.skillex.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.lang.NonNull;
import org.springframework.messaging.converter.DefaultContentTypeResolver;
import org.springframework.messaging.converter.MappingJackson2MessageConverter;
import org.springframework.messaging.converter.MessageConverter;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.util.MimeTypeUtils;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import java.util.List;

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
 *  After upgrade the JWT is validated in JwtChannelInterceptor on every CONNECT frame.
 */
@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final JwtChannelInterceptor jwtChannelInterceptor;
    private final SessionStompAuthorizationInterceptor sessionStompAuthorizationInterceptor;
    private final ObjectMapper objectMapper;

    @Value("${app.cors.allowed-origins}")
    private String allowedOriginsRaw;

    @Override
    public void registerStompEndpoints(@NonNull StompEndpointRegistry registry) {
        // Mirror the HTTP CORS allow-list instead of "*" so the SockJS handshake
        // only accepts the configured frontend origins.
        String[] origins = java.util.Arrays.stream(allowedOriginsRaw.split(","))
            .map(String::trim)
            .filter(s -> !s.isEmpty())
            .toArray(String[]::new);

        registry.addEndpoint("/ws")
            .setAllowedOriginPatterns(origins.length == 0 ? new String[]{"*"} : origins)
            .withSockJS();
    }

    @Override
    public void configureMessageBroker(@NonNull MessageBrokerRegistry registry) {
        // In-memory broker for /topic (broadcasts) and /user (point-to-point)
        registry.enableSimpleBroker("/topic", "/user");
        // Client sends messages to /app/…
        registry.setApplicationDestinationPrefixes("/app");
        // Enables /user/{name}/queue/… routing for convertAndSendToUser
        registry.setUserDestinationPrefix("/user");
    }

    @Override
    public void configureClientInboundChannel(@NonNull ChannelRegistration registration) {
        // Order matters: authenticate the CONNECT first (sets the Principal), then
        // authorize SUBSCRIBE/SEND to session-room destinations against that Principal.
        registration.interceptors(jwtChannelInterceptor, sessionStompAuthorizationInterceptor);
    }

    @Override
    public boolean configureMessageConverters(@NonNull List<MessageConverter> messageConverters) {
        DefaultContentTypeResolver resolver = new DefaultContentTypeResolver();
        resolver.setDefaultMimeType(MimeTypeUtils.APPLICATION_JSON);

        MappingJackson2MessageConverter converter = new MappingJackson2MessageConverter();
        converter.setContentTypeResolver(resolver);
        converter.setObjectMapper(objectMapper);

        messageConverters.add(converter);
        return false;
    }
}

