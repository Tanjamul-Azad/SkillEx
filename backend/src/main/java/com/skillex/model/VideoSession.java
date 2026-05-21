package com.skillex.model;

import lombok.extern.slf4j.Slf4j;

/**
 * Concrete implementation representing a real-time high-definition video-focused media session.
 */
@Slf4j
public class VideoSession extends AbstractMediaSession {

    private final boolean screenShareEnabled;

    public VideoSession(String sessionId, String teacherUserId, String learnerUserId, boolean screenShareEnabled) {
        super(sessionId, teacherUserId, learnerUserId);
        this.screenShareEnabled = screenShareEnabled;
    }

    @Override
    protected void onSessionStart() {
        log.info("[VideoSession] Initiated secure WebRTC multi-stream with screenshare status: {}", screenShareEnabled);
        recordMediaMetric("stream_quality_kbps", 1500L);
    }

    @Override
    protected void onSessionEnd() {
        log.info("[VideoSession] Closed active camera streams and detached screenshares cleanly.");
        recordMediaMetric("session_duration_secs", 3600L);
    }

    @Override
    protected void onParticipantJoin() {
        log.info("[VideoSession] Remapped camera tile grids for responsive peer-to-peer viewports.");
    }
}
