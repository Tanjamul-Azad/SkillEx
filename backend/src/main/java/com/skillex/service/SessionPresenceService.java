package com.skillex.service;

import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class SessionPresenceService {

    private final Map<String, Set<String>> sessionParticipants = new ConcurrentHashMap<>();

    public PresenceSnapshot markJoined(String sessionId, String userId) {
        Set<String> participants = sessionParticipants.computeIfAbsent(sessionId, ignored -> ConcurrentHashMap.newKeySet());
        participants.add(userId);
        return snapshot(sessionId);
    }

    public PresenceSnapshot markLeft(String sessionId, String userId) {
        Set<String> participants = sessionParticipants.get(sessionId);
        if (participants != null) {
            participants.remove(userId);
            if (participants.isEmpty()) {
                sessionParticipants.remove(sessionId);
            }
        }
        return snapshot(sessionId);
    }

    public PresenceSnapshot snapshot(String sessionId) {
        Set<String> participants = sessionParticipants.getOrDefault(sessionId, Set.of());
        return new PresenceSnapshot(sessionId, new HashSet<>(participants), LocalDateTime.now());
    }

    public record PresenceSnapshot(String sessionId, Set<String> participantUserIds, LocalDateTime updatedAt) {
        public Map<String, Object> toPayload(String event, String actorUserId) {
            Map<String, Object> payload = new HashMap<>();
            payload.put("event", event);
            payload.put("sessionId", sessionId);
            payload.put("actorUserId", actorUserId);
            payload.put("participantUserIds", participantUserIds);
            payload.put("count", participantUserIds.size());
            payload.put("updatedAt", updatedAt.toString());
            return payload;
        }
    }
}

