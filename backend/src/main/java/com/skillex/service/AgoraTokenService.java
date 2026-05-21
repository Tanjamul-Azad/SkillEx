package com.skillex.service;

import io.agora.media.RtcTokenBuilder2;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Service for generating secure WebRTC access tokens for Agora video/audio channels.
 */
@Service
@Slf4j
public class AgoraTokenService {

    @Value("${app.agora.app-id:}")
    private String appId;

    @Value("${app.agora.app-certificate:}")
    private String appCertificate;

    // Token default expiration: 3600 seconds (1 hour)
    private static final int EXPIRATION_TIME_SECONDS = 3600;

    /**
     * Generates a secure Agora RTC token for a channel and user ID.
     * Generates a deterministic mock token if credentials are not configured.
     * 
     * @param channelName The session or room identifier
     * @param userId The unique String UUID of the user
     * @return String RTC token
     */
    public String generateToken(String channelName, String userId) {
        // Hash String UUID deterministically to a positive 32-bit integer for Agora compatibility
        int uid = Math.abs(userId.hashCode());

        if (appId == null || appId.isBlank() || appCertificate == null || appCertificate.isBlank()) {
            log.warn("[Agora] Agora APP_ID or APP_CERTIFICATE not configured. Generating static developer mock token.");
            return "mock-agora-rtc-token-for-uid-" + uid + "-channel-" + channelName;
        }

        try {
            RtcTokenBuilder2 tokenBuilder = new RtcTokenBuilder2();
            
            // Generate token with publisher role for full interactive participation
            String token = tokenBuilder.buildTokenWithUid(
                    appId,
                    appCertificate,
                    channelName,
                    uid,
                    RtcTokenBuilder2.Role.ROLE_PUBLISHER,
                    EXPIRATION_TIME_SECONDS,
                    EXPIRATION_TIME_SECONDS
            );

            log.info("[Agora] Generated secure RTC token for channel: {}, uid: {}", channelName, uid);
            return token;
        } catch (Exception e) {
            log.error("[Agora] Failed to generate Agora RTC token. Falling back to mock token.", e);
            return "fallback-mock-token-for-" + uid;
        }
    }
}
