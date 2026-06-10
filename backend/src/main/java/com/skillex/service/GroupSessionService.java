package com.skillex.service;

import com.skillex.dto.ai.GroupSessionDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface GroupSessionService {
    /**
     * Create a new group session (workshop, class, etc.).
     * One mentor teaches multiple learners.
     *
     * @param userId mentor ID
     * @param request session details
     * @return created session
     */
    GroupSessionDto create(String userId, GroupSessionDto.CreateRequest request);

    /**
     * Learner joins an active group session.
     *
     * @param learnerUserId learner
     * @param sessionId group session
     */
    void joinSession(String learnerUserId, String sessionId);

    /**
     * Get group session details.
     *
     * @param sessionId session ID
     * @return session with attendees and notes
     */
    GroupSessionDto getSession(String sessionId);

    /**
     * List all active group sessions (for discovery).
     *
     * @param pageable pagination
     * @return available sessions
     */
    Page<GroupSessionDto> listActive(Pageable pageable);

    /**
     * List sessions a user is attending.
     *
     * @param userId learner/mentor
     * @param pageable pagination
     * @return user's sessions
     */
    Page<GroupSessionDto> listUserSessions(String userId, Pageable pageable);

    /**
     * Complete group session and generate group certificate for all attendees.
     *
     * @param sessionId session ID
     * @param mentorNotes shared notes from session
     */
    void completeSes sion(String sessionId, String mentorNotes);

    /**
     * Generate group certificate for attendee.
     *
     * @param sessionId session
     * @param learnerUserId learner
     * @return certificate data
     */
    GroupSessionDto.GroupCertificate generateCertificate(String sessionId, String learnerUserId);
}
