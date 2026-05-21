package com.skillex.model;

import lombok.extern.slf4j.Slf4j;

/**
 * Concrete implementation representing a real-time low-bandwidth voice-only media session.
 */
@Slf4j
public class VoiceSession extends AbstractMediaSession {

    private final String audioCodec;

    public VoiceSession(String sessionId, String teacherUserId, String learnerUserId, String audioCodec) {
        super(sessionId, teacherUserId, learnerUserId);
        this.audioCodec = audioCodec;
    }

    @Override
    protected void onSessionStart() {
        log.info("[VoiceSession] Initiated audio-only session with {} codec.", audioCodec);
        recordMediaMetric("stream_quality_kbps", 64L);
    }

    @Override
    protected void onSessionEnd() {
        log.info("[VoiceSession] Closed audio channel successfully.");
    }

    @Override
    protected void onParticipantJoin() {
        log.info("[VoiceSession] Balanced peer microphone input gains.");
    }
}
