package com.skillex.service.impl;

import com.skillex.dto.common.PagedResponse;
import com.skillex.dto.session.*;
import com.skillex.model.Exchange;
import com.skillex.model.Session;
import com.skillex.model.Session.MeetingType;
import com.skillex.model.Skill;
import com.skillex.model.User;
import com.skillex.repository.ExchangeRepository;
import com.skillex.repository.SessionNoteRepository;
import com.skillex.repository.SessionRepository;
import com.skillex.repository.SessionTranscriptRepository;
import com.skillex.repository.UserRepository;
import com.skillex.service.DtoMapper;
import com.skillex.service.SessionService;
import com.skillex.service.NotificationService;
import com.skillex.service.reputation.ReputationUpdateEvent;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class SessionServiceImpl implements SessionService {

    private static final int MAX_SESSION_DURATION_MINS = 240;
    private static final int ACCEPT_PAST_GRACE_MINS = 10;
    private static final Collection<Session.SessionStatus> ACTIVE_STATUSES = Set.of(
        Session.SessionStatus.PROPOSED,
        Session.SessionStatus.SCHEDULED,
        Session.SessionStatus.IN_PROGRESS
    );

    private final SessionRepository sessionRepository;
    private final ExchangeRepository exchangeRepository;
    private final UserRepository userRepository;
    private final SessionTranscriptRepository transcriptRepository;
    private final SessionNoteRepository noteRepository;
    private final DtoMapper mapper;
    private final ApplicationEventPublisher eventPublisher;
    private final NotificationService notificationService;

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<SessionDto> getSessionsForUser(String userId, int page, int size) {
        var pageable = PageRequest.of(page, size, Sort.by("scheduledAt").descending());
        return PagedResponse.of(
            sessionRepository.findByUserId(userId, pageable).map(mapper::toSession));
    }

    @Override
    @Transactional(readOnly = true)
    public SessionDto getById(String sessionId, String requestingUserId) {
        Session session = findSession(sessionId);
        assertParticipant(session, requestingUserId);
        return mapper.toSession(session);
    }

    @Override
    @Transactional
    public SessionDto create(String requestingUserId, CreateSessionRequest req) {
        Exchange exchange = exchangeRepository.findById(req.exchangeId())
            .orElseThrow(() -> new EntityNotFoundException("Exchange not found: " + req.exchangeId()));
        assertExchangeParticipant(exchange, requestingUserId);

        if (exchange.getStatus() != Exchange.ExchangeStatus.ACCEPTED) {
            throw new IllegalStateException("Only accepted exchanges can be scheduled.");
        }

        // Resolve who is proposing (the person making the request)
        User proposer = userRepository.findById(requestingUserId)
            .orElseThrow(() -> new EntityNotFoundException("User not found: " + requestingUserId));

        ScheduleDetails details = resolveScheduleDetails(exchange, requestingUserId, req.skillId());
        assertClientScheduleMatches(req, details);
        assertNoActiveSessionForExchangeSkill(exchange.getId(), details.skill().getId());
        assertNoScheduleOverlap(details.teacher(), details.learner(), req.scheduledAt(), req.durationMins(), null);

        // Determine meeting type
        MeetingType meetingType = resolveMeetingType(req.sessionType());

        Session session = new Session();
        session.setExchange(exchange);
        session.setTeacher(details.teacher());
        session.setLearner(details.learner());
        session.setSkill(details.skill());
        session.setProposedBy(proposer);
        session.setScheduledAt(req.scheduledAt());
        session.setDurationMins(req.durationMins());
        session.setMeetLink(req.meetLink());
        session.setSessionType(meetingType);
        session.setStatus(Session.SessionStatus.PROPOSED);
        Session saved = sessionRepository.save(session);

        // Send a real-time notification to the partner
        try {
            String recipientId = requestingUserId.equals(details.teacher().getId())
                ? details.learner().getId()
                : details.teacher().getId();
            String message = proposer.getName() + " proposed a " + meetingType.name().toLowerCase()
                    + " session for " + details.skill().getName() + " on "
                    + req.scheduledAt().toLocalDate() + " at " + req.scheduledAt().toLocalTime() + ".";
            notificationService.create(recipientId, requestingUserId, "SESSION_SCHEDULED", message);
        } catch (Exception e) {
            log.warn("[Session] Failed to send proposal notification", e);
        }

        return mapper.toSession(saved);
    }

    @Override
    @Transactional
    public SessionDto acceptProposal(String sessionId, String requestingUserId) {
        Session session = findSession(sessionId);
        assertParticipant(session, requestingUserId);

        if (session.getStatus() != Session.SessionStatus.PROPOSED) {
            throw new IllegalStateException("Session is not in PROPOSED state. Current: " + session.getStatus());
        }

        // The person accepting must NOT be the one who proposed
        if (session.getProposedBy() != null && session.getProposedBy().getId().equals(requestingUserId)) {
            throw new IllegalStateException("You cannot accept your own proposal. Wait for your partner to respond.");
        }

        assertNoScheduleOverlap(
            session.getTeacher(),
            session.getLearner(),
            session.getScheduledAt(),
            session.getDurationMins(),
            session.getId(),
            ACCEPT_PAST_GRACE_MINS
        );

        session.setStatus(Session.SessionStatus.SCHEDULED);
        session.getExchange().setSessionDate(session.getScheduledAt());
        Session saved = sessionRepository.save(session);
        exchangeRepository.save(saved.getExchange());

        // Notify the proposer that their time was accepted
        try {
            User acceptor = userRepository.findById(requestingUserId).orElse(null);
            String proposerId = session.getProposedBy() != null ? session.getProposedBy().getId() : null;
            if (proposerId != null && acceptor != null) {
                String message = acceptor.getName() + " accepted your proposed session time!";
                notificationService.create(proposerId, requestingUserId, "SESSION_SCHEDULED", message);
            }
        } catch (Exception e) {
            log.warn("[Session] Failed to send acceptance notification", e);
        }

        log.info("[Session] Session {} accepted by user {} — status → SCHEDULED", sessionId, requestingUserId);
        return mapper.toSession(saved);
    }

    @Override
    @Transactional
    public SessionDto reschedule(String sessionId, String requestingUserId, LocalDateTime newScheduledAt, int durationMins) {
        Session session = findSession(sessionId);
        assertParticipant(session, requestingUserId);

        if (session.getStatus() == Session.SessionStatus.COMPLETED || session.getStatus() == Session.SessionStatus.CANCELLED) {
            throw new IllegalStateException("Cannot reschedule a " + session.getStatus() + " session.");
        }
        assertScheduleInput(newScheduledAt, durationMins);

        // Update the proposer to the person making the reschedule request
        User newProposer = userRepository.findById(requestingUserId)
            .orElseThrow(() -> new EntityNotFoundException("User not found: " + requestingUserId));

        assertNoScheduleOverlap(session.getTeacher(), session.getLearner(), newScheduledAt, durationMins, session.getId());

        session.setProposedBy(newProposer);
        session.setScheduledAt(newScheduledAt);
        session.setDurationMins(durationMins);
        session.setStatus(Session.SessionStatus.PROPOSED);
        session.getExchange().setSessionDate(null);
        Session saved = sessionRepository.save(session);
        exchangeRepository.save(saved.getExchange());

        // Notify the other party about the reschedule
        try {
            String partnerId = requestingUserId.equals(session.getTeacher().getId())
                ? session.getLearner().getId()
                : session.getTeacher().getId();
            String message = newProposer.getName() + " proposed a new time: "
                + newScheduledAt.toLocalDate() + " at " + newScheduledAt.toLocalTime() + ".";
            notificationService.create(partnerId, requestingUserId, "SESSION_SCHEDULED", message);
        } catch (Exception e) {
            log.warn("[Session] Failed to send reschedule notification", e);
        }

        log.info("[Session] Session {} rescheduled by user {} — status → PROPOSED", sessionId, requestingUserId);
        return mapper.toSession(saved);
    }

    @Override
    @Transactional
    public SessionDto markCompleted(String sessionId, String requestingUserId) {
        Session session = findSession(sessionId);
        assertParticipant(session, requestingUserId);
        session.setStatus(Session.SessionStatus.COMPLETED);
        SessionDto result = mapper.toSession(sessionRepository.save(session));

        // Notify reputation system for both participants
        eventPublisher.publishEvent(new ReputationUpdateEvent(
            session.getTeacher().getId(), ReputationUpdateEvent.Trigger.SESSION_COMPLETED));
        eventPublisher.publishEvent(new ReputationUpdateEvent(
            session.getLearner().getId(), ReputationUpdateEvent.Trigger.SESSION_COMPLETED));

        return result;
    }

    @Override
    @Transactional
    public SessionDto markCancelled(String sessionId, String requestingUserId) {
        Session session = findSession(sessionId);
        assertParticipant(session, requestingUserId);
        session.setStatus(Session.SessionStatus.CANCELLED);
        return mapper.toSession(sessionRepository.save(session));
    }

    @Override
    @Transactional
    public SessionDto updateNotes(String sessionId, String notes, String requestingUserId) {
        Session session = findSession(sessionId);
        assertParticipant(session, requestingUserId);
        session.setSharedNotes(notes);
        return mapper.toSession(sessionRepository.save(session));
    }

    @Override
    @Transactional
    public void joinSession(String sessionId, String requestingUserId) {
        Session session = findSession(sessionId);
        assertParticipant(session, requestingUserId);
        assertJoinable(session);

        // Notify the partner that this user has joined the study room
        try {
            User teacher = session.getTeacher();
            User learner = session.getLearner();
            String senderName = requestingUserId.equals(teacher.getId()) ? teacher.getName() : learner.getName();
            String recipientId = requestingUserId.equals(teacher.getId()) ? learner.getId() : teacher.getId();
            
            String message = senderName + " has joined the Study Room! Click to join them.";
            notificationService.create(recipientId, requestingUserId, "SESSION_SCHEDULED", message);
        } catch (Exception e) {
            // Log warning but don't fail transaction if notification delivery fails
        }
    }

    @Override
    @Transactional
    public void deleteSession(String sessionId, String requestingUserId) {
        Session session = findSession(sessionId);
        assertParticipant(session, requestingUserId);

        // Only allow deletion of completed sessions (post-review cleanup)
        if (session.getStatus() != Session.SessionStatus.COMPLETED) {
            throw new IllegalStateException("Can only delete completed sessions. Current: " + session.getStatus());
        }

        log.info("[Session] Deleting session {} (requested by user {}): cleaning up transcripts, notes, and session record.", sessionId, requestingUserId);

        // 1. Delete all transcript chunks
        transcriptRepository.deleteBySessionId(sessionId);

        // 2. Delete AI-generated notes
        noteRepository.deleteBySessionId(sessionId);

        // 3. Delete the session record itself
        sessionRepository.delete(session);

        log.info("[Session] Session {} and all associated data successfully deleted.", sessionId);
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private Session findSession(String id) {
        return sessionRepository.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("Session not found: " + id));
    }

    private void assertParticipant(Session session, String userId) {
        boolean ok = session.getTeacher().getId().equals(userId)
            || session.getLearner().getId().equals(userId);
        if (!ok) {
            throw new AccessDeniedException("You are not a participant of this session.");
        }
    }

    private void assertExchangeParticipant(Exchange exchange, String userId) {
        boolean ok = exchange.getRequester().getId().equals(userId)
            || exchange.getReceiver().getId().equals(userId);
        if (!ok) {
            throw new AccessDeniedException("You are not a participant in this exchange.");
        }
    }

    private ScheduleDetails resolveScheduleDetails(Exchange exchange, String requestingUserId, String requestedSkillId) {
        Skill offeredSkill = exchange.getOfferedSkill();
        Skill wantedSkill = exchange.getWantedSkill();

        if (hasText(requestedSkillId)) {
            if (offeredSkill != null && offeredSkill.getId().equals(requestedSkillId)) {
                return new ScheduleDetails(exchange.getRequester(), exchange.getReceiver(), offeredSkill);
            }
            if (wantedSkill != null && wantedSkill.getId().equals(requestedSkillId)) {
                return new ScheduleDetails(exchange.getReceiver(), exchange.getRequester(), wantedSkill);
            }
            throw new IllegalArgumentException("Selected skill does not belong to this exchange.");
        }

        boolean requesterScheduling = exchange.getRequester().getId().equals(requestingUserId);
        if (requesterScheduling && offeredSkill != null) {
            return new ScheduleDetails(exchange.getRequester(), exchange.getReceiver(), offeredSkill);
        }
        if (!requesterScheduling && wantedSkill != null) {
            return new ScheduleDetails(exchange.getReceiver(), exchange.getRequester(), wantedSkill);
        }
        if (offeredSkill != null) {
            return new ScheduleDetails(exchange.getRequester(), exchange.getReceiver(), offeredSkill);
        }
        if (wantedSkill != null) {
            return new ScheduleDetails(exchange.getReceiver(), exchange.getRequester(), wantedSkill);
        }
        throw new IllegalStateException("Exchange has no schedulable skill.");
    }

    private void assertClientScheduleMatches(CreateSessionRequest req, ScheduleDetails details) {
        if (hasText(req.teacherId()) && !details.teacher().getId().equals(req.teacherId())) {
            throw new IllegalArgumentException("Teacher does not match the selected exchange skill.");
        }
        if (hasText(req.learnerId()) && !details.learner().getId().equals(req.learnerId())) {
            throw new IllegalArgumentException("Learner does not match the selected exchange skill.");
        }
    }

    private void assertNoActiveSessionForExchangeSkill(String exchangeId, String skillId) {
        LocalDateTime now = LocalDateTime.now();
        boolean hasBlockingSession = sessionRepository
            .findByExchangeIdAndSkillIdAndStatusIn(exchangeId, skillId, ACTIVE_STATUSES)
            .stream()
            .anyMatch(session -> session.getScheduledAt() != null
                && session.getScheduledAt().plusMinutes(Math.max(session.getDurationMins(), 0)).isAfter(now));

        if (hasBlockingSession) {
            throw new IllegalStateException("This exchange already has an active session for that skill.");
        }
    }

    private void assertNoScheduleOverlap(
        User teacher,
        User learner,
        LocalDateTime scheduledAt,
        int durationMins,
        String excludedSessionId
    ) {
        assertNoScheduleOverlap(teacher, learner, scheduledAt, durationMins, excludedSessionId, 0);
    }

    private void assertNoScheduleOverlap(
        User teacher,
        User learner,
        LocalDateTime scheduledAt,
        int durationMins,
        String excludedSessionId,
        int pastGraceMins
    ) {
        assertScheduleInput(scheduledAt, durationMins, pastGraceMins);

        LocalDateTime start = scheduledAt;
        LocalDateTime end = scheduledAt.plusMinutes(durationMins);
        LocalDateTime windowStart = start.minusMinutes(MAX_SESSION_DURATION_MINS);

        boolean teacherBusy = sessionRepository.findActiveSessionsInWindow(
            teacher.getId(), ACTIVE_STATUSES, windowStart, end
        ).stream().anyMatch(existing -> overlaps(existing, start, end, excludedSessionId));

        boolean learnerBusy = sessionRepository.findActiveSessionsInWindow(
            learner.getId(), ACTIVE_STATUSES, windowStart, end
        ).stream().anyMatch(existing -> overlaps(existing, start, end, excludedSessionId));

        if (teacherBusy || learnerBusy) {
            throw new IllegalStateException("One of the participants already has a session in that time slot.");
        }
    }

    private void assertScheduleInput(LocalDateTime scheduledAt, int durationMins) {
        assertScheduleInput(scheduledAt, durationMins, 0);
    }

    private void assertScheduleInput(LocalDateTime scheduledAt, int durationMins, int pastGraceMins) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime min = pastGraceMins > 0 ? now.minusMinutes(pastGraceMins) : now;
        if (scheduledAt == null || !scheduledAt.isAfter(min)) {
            throw new IllegalArgumentException("Session time must be in the future.");
        }
        if (durationMins < 15 || durationMins > MAX_SESSION_DURATION_MINS) {
            throw new IllegalArgumentException("Session duration must be between 15 and 240 minutes.");
        }
    }

    private boolean overlaps(Session existing, LocalDateTime start, LocalDateTime end, String excludedSessionId) {
        if (excludedSessionId != null && excludedSessionId.equals(existing.getId())) {
            return false;
        }
        LocalDateTime existingStart = existing.getScheduledAt();
        LocalDateTime existingEnd = existingStart.plusMinutes(existing.getDurationMins());
        return existingStart.isBefore(end) && existingEnd.isAfter(start);
    }

    private MeetingType resolveMeetingType(String rawType) {
        if (rawType != null && rawType.equalsIgnoreCase("AUDIO")) {
            return MeetingType.AUDIO;
        }
        return MeetingType.VIDEO;
    }

    private void assertJoinable(Session session) {
        if (session.getStatus() != Session.SessionStatus.SCHEDULED
            && session.getStatus() != Session.SessionStatus.IN_PROGRESS) {
            throw new IllegalStateException("Session must be scheduled before it can be joined.");
        }
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private record ScheduleDetails(User teacher, User learner, Skill skill) {}
}
