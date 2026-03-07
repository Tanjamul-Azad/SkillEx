package com.skillex.service;

import com.skillex.dto.common.PagedResponse;
import com.skillex.dto.session.*;

/**
 * Contract for one-on-one skill swap sessions.
 */
public interface SessionService {

    PagedResponse<SessionDto> getSessionsForUser(String userId, int page, int size);

    SessionDto getById(String sessionId, String requestingUserId);

    SessionDto create(String requestingUserId, CreateSessionRequest req);

    SessionDto markCompleted(String sessionId, String requestingUserId);

    SessionDto markCancelled(String sessionId, String requestingUserId);
}
