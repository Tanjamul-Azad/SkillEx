package com.skillex.service.impl;

import com.skillex.dto.common.PagedResponse;
import com.skillex.dto.session.*;
import com.skillex.model.Exchange;
import com.skillex.model.Session;
import com.skillex.model.Skill;
import com.skillex.model.User;
import com.skillex.repository.ExchangeRepository;
import com.skillex.repository.SessionRepository;
import com.skillex.repository.SkillRepository;
import com.skillex.repository.UserRepository;
import com.skillex.service.DtoMapper;
import com.skillex.service.SessionService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@SuppressWarnings("null")
public class SessionServiceImpl implements SessionService {

    private final SessionRepository sessionRepository;
    private final ExchangeRepository exchangeRepository;
    private final UserRepository userRepository;
    private final SkillRepository skillRepository;
    private final DtoMapper mapper;

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
        User teacher = userRepository.findById(req.teacherId())
            .orElseThrow(() -> new EntityNotFoundException("User not found: " + req.teacherId()));
        User learner = userRepository.findById(req.learnerId())
            .orElseThrow(() -> new EntityNotFoundException("User not found: " + req.learnerId()));
        Skill skill  = skillRepository.findById(req.skillId())
            .orElseThrow(() -> new EntityNotFoundException("Skill not found: " + req.skillId()));

        Session session = new Session();
        session.setId(UUID.randomUUID().toString());
        session.setExchange(exchange);
        session.setTeacher(teacher);
        session.setLearner(learner);
        session.setSkill(skill);
        session.setScheduledAt(req.scheduledAt());
        session.setDurationMins(req.durationMins());
        session.setMeetLink(req.meetLink());
        session.setStatus(Session.SessionStatus.SCHEDULED);
        return mapper.toSession(sessionRepository.save(session));
    }

    @Override
    @Transactional
    public SessionDto markCompleted(String sessionId, String requestingUserId) {
        Session session = findSession(sessionId);
        assertParticipant(session, requestingUserId);
        session.setStatus(Session.SessionStatus.COMPLETED);
        return mapper.toSession(sessionRepository.save(session));
    }

    @Override
    @Transactional
    public SessionDto markCancelled(String sessionId, String requestingUserId) {
        Session session = findSession(sessionId);
        assertParticipant(session, requestingUserId);
        session.setStatus(Session.SessionStatus.CANCELLED);
        return mapper.toSession(sessionRepository.save(session));
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
}
