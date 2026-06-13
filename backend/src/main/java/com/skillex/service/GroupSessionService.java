package com.skillex.service;

import com.skillex.dto.ai.GroupSessionDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

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
     * Generate an AI workshop draft for a mentor-owned skill. The caller still
     * chooses the date/time before publishing the real session.
     */
    GroupSessionDto.WorkshopDraft generateWorkshopDraft(String userId, GroupSessionDto.AiDraftRequest request);

    /**
     * Learner joins an active group session.
     *
     * @param learnerUserId learner
     * @param sessionId group session
     */
    void joinSession(String learnerUserId, String sessionId);

    /**
     * Learner leaves a session they previously joined.
     *
     * @param learnerUserId learner
     * @param sessionId group session
     */
    void leaveSession(String learnerUserId, String sessionId);

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
     * List sessions a user is attending or hosting.
     *
     * @param userId learner/mentor
     * @param pageable pagination
     * @return user's sessions
     */
    Page<GroupSessionDto> listUserSessions(String userId, Pageable pageable);

    /**
     * Complete a group session. Only the hosting mentor may complete it.
     *
     * @param mentorId caller (must be the session's mentor)
     * @param sessionId session ID
     * @param mentorNotes shared notes from session
     */
    void completeSession(String mentorId, String sessionId, String mentorNotes);

    /**
     * Cancel a scheduled group session. Only the hosting mentor may cancel.
     *
     * @param mentorId caller (must be the session's mentor)
     * @param sessionId session ID
     */
    void cancelSession(String mentorId, String sessionId);

    /**
     * Generate (or fetch the existing) certificate for an attendee of a completed session.
     *
     * @param sessionId session
     * @param learnerUserId learner
     * @return certificate data
     */
    GroupSessionDto.GroupCertificate generateCertificate(String sessionId, String learnerUserId);

    /**
     * Start a group session. Only the hosting mentor may start it.
     *
     * @param mentorId caller (must be the session's mentor)
     * @param sessionId session ID
     * @param meetingLink meeting link (optional, e.g. zoom/google meet)
     */
    void startSession(String mentorId, String sessionId, String meetingLink);
}
