package com.skillex.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
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
    @NonNull
    private final ObjectMapper objectMapper;

    @Override
    public void registerStompEndpoints(@NonNull StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
            .setAllowedOriginPatterns("*")
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
        // Validate JWT on every CONNECT and set Principal for the STOMP session
        registration.interceptors(jwtChannelInterceptor);
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

