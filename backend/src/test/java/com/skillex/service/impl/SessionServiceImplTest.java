package com.skillex.service.impl;

import com.skillex.dto.session.CreateSessionRequest;
import com.skillex.model.Exchange;
import com.skillex.model.Session;
import com.skillex.model.Skill;
import com.skillex.model.User;
import com.skillex.repository.ExchangeRepository;
import com.skillex.repository.SessionNoteRepository;
import com.skillex.repository.SessionRepository;
import com.skillex.repository.SessionTranscriptRepository;
import com.skillex.repository.UserRepository;
import com.skillex.service.DtoMapper;
import com.skillex.service.NotificationService;
import com.skillex.service.AccountRestrictionService;
import com.skillex.service.CertificateService;
import com.skillex.service.CreditService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SessionServiceImplTest {

    @Mock private SessionRepository sessionRepository;
    @Mock private ExchangeRepository exchangeRepository;
    @Mock private UserRepository userRepository;
    @Mock private SessionTranscriptRepository transcriptRepository;
    @Mock private SessionNoteRepository noteRepository;
    @Mock private DtoMapper mapper;
    @Mock private ApplicationEventPublisher eventPublisher;
    @Mock private NotificationService notificationService;
    @Mock private AccountRestrictionService restrictionService;
    @Mock private CreditService creditService;
    @Mock private CertificateService certificateService;

    private SessionServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new SessionServiceImpl(
            sessionRepository,
            exchangeRepository,
            userRepository,
            transcriptRepository,
            noteRepository,
            mapper,
            eventPublisher,
            notificationService,
            restrictionService,
            creditService,
            certificateService
        );
    }

    @Test
    void create_resolvesReceiverAsTeacherForWantedSkill() {
        User requester = user("requester", "Requester");
        User receiver = user("receiver", "Receiver");
        Skill offered = skill("video", "Video Editing");
        Skill wanted = skill("figma", "Figma");
        Exchange exchange = acceptedExchange("exchange-1", requester, receiver, offered, wanted);

        when(exchangeRepository.findById(exchange.getId())).thenReturn(Optional.of(exchange));
        when(userRepository.findById(receiver.getId())).thenReturn(Optional.of(receiver));
        when(sessionRepository.findByExchangeIdAndSkillIdAndStatusIn(eq(exchange.getId()), eq(wanted.getId()), anyCollection()))
            .thenReturn(List.of());
        when(sessionRepository.findActiveSessionsInWindow(eq(receiver.getId()), anyCollection(), any(), any()))
            .thenReturn(List.of());
        when(sessionRepository.findActiveSessionsInWindow(eq(requester.getId()), anyCollection(), any(), any()))
            .thenReturn(List.of());
        when(sessionRepository.save(any(Session.class))).thenAnswer(invocation -> invocation.getArgument(0));

        service.create(receiver.getId(), new CreateSessionRequest(
            exchange.getId(),
            receiver.getId(),
            requester.getId(),
            wanted.getId(),
            LocalDateTime.now().plusDays(1),
            60,
            null,
            "VIDEO"
        ));

        ArgumentCaptor<Session> sessionCaptor = ArgumentCaptor.forClass(Session.class);
        verify(sessionRepository).save(sessionCaptor.capture());
        Session saved = sessionCaptor.getValue();
        assertEquals(receiver.getId(), saved.getTeacher().getId());
        assertEquals(requester.getId(), saved.getLearner().getId());
        assertEquals(wanted.getId(), saved.getSkill().getId());
        assertEquals(Session.SessionStatus.PROPOSED, saved.getStatus());
    }

    @Test
    void create_rejectsUnacceptedExchange() {
        User requester = user("requester", "Requester");
        User receiver = user("receiver", "Receiver");
        Exchange exchange = acceptedExchange("exchange-1", requester, receiver, skill("video", "Video"), null);
        exchange.setStatus(Exchange.ExchangeStatus.PENDING);

        when(exchangeRepository.findById(exchange.getId())).thenReturn(Optional.of(exchange));

        assertThrows(IllegalStateException.class, () -> service.create(requester.getId(), new CreateSessionRequest(
            exchange.getId(),
            requester.getId(),
            receiver.getId(),
            "video",
            LocalDateTime.now().plusDays(1),
            60,
            null,
            "VIDEO"
        )));
    }

    @Test
    void acceptProposal_setsExchangeSessionDateAfterPartnerAccepts() {
        User requester = user("requester", "Requester");
        User receiver = user("receiver", "Receiver");
        Skill skill = skill("video", "Video Editing");
        Exchange exchange = acceptedExchange("exchange-1", requester, receiver, skill, null);
        LocalDateTime scheduledAt = LocalDateTime.now().plusDays(1);

        Session session = new Session();
        session.setId("session-1");
        session.setExchange(exchange);
        session.setTeacher(requester);
        session.setLearner(receiver);
        session.setSkill(skill);
        session.setProposedBy(requester);
        session.setScheduledAt(scheduledAt);
        session.setDurationMins(60);
        session.setStatus(Session.SessionStatus.PROPOSED);

        when(sessionRepository.findById(session.getId())).thenReturn(Optional.of(session));
        when(sessionRepository.findActiveSessionsInWindow(eq(requester.getId()), anyCollection(), any(), any()))
            .thenReturn(List.of(session));
        when(sessionRepository.findActiveSessionsInWindow(eq(receiver.getId()), anyCollection(), any(), any()))
            .thenReturn(List.of(session));
        when(sessionRepository.save(session)).thenReturn(session);
        when(userRepository.findById(receiver.getId())).thenReturn(Optional.of(receiver));

        service.acceptProposal(session.getId(), receiver.getId());

        assertEquals(Session.SessionStatus.SCHEDULED, session.getStatus());
        assertEquals(scheduledAt, exchange.getSessionDate());
        verify(exchangeRepository).save(exchange);
    }

    @Test
    void create_allowsNewSessionWhenOnlyExpiredActiveSessionExists() {
        User requester = user("requester", "Requester");
        User receiver = user("receiver", "Receiver");
        Skill offered = skill("video", "Video Editing");
        Exchange exchange = acceptedExchange("exchange-1", requester, receiver, offered, null);

        Session expired = new Session();
        expired.setId("session-expired");
        expired.setScheduledAt(LocalDateTime.now().minusHours(3));
        expired.setDurationMins(60);
        expired.setStatus(Session.SessionStatus.PROPOSED);

        when(exchangeRepository.findById(exchange.getId())).thenReturn(Optional.of(exchange));
        when(userRepository.findById(requester.getId())).thenReturn(Optional.of(requester));
        when(sessionRepository.findByExchangeIdAndSkillIdAndStatusIn(eq(exchange.getId()), eq(offered.getId()), anyCollection()))
            .thenReturn(List.of(expired));
        when(sessionRepository.findActiveSessionsInWindow(eq(requester.getId()), anyCollection(), any(), any()))
            .thenReturn(List.of());
        when(sessionRepository.findActiveSessionsInWindow(eq(receiver.getId()), anyCollection(), any(), any()))
            .thenReturn(List.of());
        when(sessionRepository.save(any(Session.class))).thenAnswer(invocation -> invocation.getArgument(0));

        assertDoesNotThrow(() -> service.create(requester.getId(), new CreateSessionRequest(
            exchange.getId(),
            requester.getId(),
            receiver.getId(),
            offered.getId(),
            LocalDateTime.now().plusDays(1),
            60,
            null,
            "VIDEO"
        )));
    }

    private static Exchange acceptedExchange(String id, User requester, User receiver, Skill offered, Skill wanted) {
        Exchange exchange = new Exchange();
        exchange.setId(id);
        exchange.setRequester(requester);
        exchange.setReceiver(receiver);
        exchange.setOfferedSkill(offered);
        exchange.setWantedSkill(wanted);
        exchange.setStatus(Exchange.ExchangeStatus.ACCEPTED);
        return exchange;
    }

    private static User user(String id, String name) {
        User user = new User();
        user.setId(id);
        user.setName(name);
        return user;
    }

    private static Skill skill(String id, String name) {
        Skill skill = new Skill();
        skill.setId(id);
        skill.setName(name);
        skill.setIcon("Video");
        skill.setCategory("Creative");
        return skill;
    }
}
