package com.skillex.service;

import com.skillex.dto.common.PagedResponse;
import com.skillex.dto.session.*;

import java.time.LocalDateTime;

/**
 * Contract for one-on-one skill swap sessions.
 */
public interface SessionService {

    PagedResponse<SessionDto> getSessionsForUser(String userId, int page, int size);

    SessionDto getById(String sessionId, String requestingUserId);

    SessionDto create(String requestingUserId, CreateSessionRequest req);

    SessionDto createForConnection(String requestingUserId, CreateConnectedSessionRequest req);

    SessionDto updateNotes(String sessionId, String notes, String requestingUserId);

    void joinSession(String sessionId, String requestingUserId);

    SessionDto markCompleted(String sessionId, String requestingUserId);

    SessionDto markCancelled(String sessionId, String requestingUserId);

    /** Other party accepts the proposed session time slot → status transitions to SCHEDULED */
    SessionDto acceptProposal(String sessionId, String requestingUserId);

    /** Either party proposes a different time → resets status to PROPOSED with new proposer */
    SessionDto reschedule(String sessionId, String requestingUserId, LocalDateTime newScheduledAt, int durationMins);

    /** Post-review cleanup: deletes session, transcripts, and AI notes permanently */
    void deleteSession(String sessionId, String requestingUserId);
}

