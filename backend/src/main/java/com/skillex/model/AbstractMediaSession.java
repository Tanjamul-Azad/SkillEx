package com.skillex.model;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import java.time.LocalDateTime;

/**
 * Abstract class representing the foundational lifecycle and tracking of a real-time media session.
 */
@Getter
@RequiredArgsConstructor
@Slf4j
public abstract class AbstractMediaSession {

    private final String sessionId;
    private final String teacherUserId;
    private final String learnerUserId;
    private LocalDateTime startedAt;
    private LocalDateTime endedAt;

    public void start() {
        this.startedAt = LocalDateTime.now();
        log.info("[MediaSession] Session {} started at {}", sessionId, startedAt);
        onSessionStart();
    }

    public void end() {
        this.endedAt = LocalDateTime.now();
        log.info("[MediaSession] Session {} ended at {}", sessionId, endedAt);
        onSessionEnd();
    }

    public void joinParticipant(String userId) {
        log.info("[MediaSession] Participant {} joined session {}", userId, sessionId);
        onParticipantJoin();
    }

    // ── Concrete helper method ───────────────────────────────────────────────
    public final void recordMediaMetric(String metricName, long value) {
        log.debug("[MediaSession] Session ID {}: Metric '{}' = {}", sessionId, metricName, value);
    }

    // ── Abstract Lifecycle Hooks ─────────────────────────────────────────────
    protected abstract void onSessionStart();
    protected abstract void onSessionEnd();
    protected abstract void onParticipantJoin();
}
