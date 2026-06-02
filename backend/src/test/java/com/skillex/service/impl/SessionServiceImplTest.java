package com.skillex.service.impl;

import com.skillex.dto.session.CreateConnectedSessionRequest; // touch
import com.skillex.dto.session.CreateSessionRequest;
import com.skillex.model.Connection;
import com.skillex.model.Exchange;
import com.skillex.model.Session;
import com.skillex.model.Skill;
import com.skillex.model.User;
import com.skillex.repository.ConnectionRepository;
import com.skillex.repository.ExchangeRepository;
import com.skillex.repository.SessionNoteRepository;
import com.skillex.repository.SessionRepository;
import com.skillex.repository.SessionTranscriptRepository;
import com.skillex.repository.SkillRepository;
import com.skillex.repository.UserSkillOfferedRepository;
import com.skillex.repository.UserRepository;
import com.skillex.service.DtoMapper;
import com.skillex.service.NotificationService;
import com.skillex.service.AccountRestrictionService;
import com.skillex.service.CertificateService;
import com.skillex.service.CreditService;
import com.skillex.service.ProgressService;
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
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SessionServiceImplTest {

    @Mock private SessionRepository sessionRepository;
    @Mock private ExchangeRepository exchangeRepository;
    @Mock private ConnectionRepository connectionRepository;
    @Mock private UserRepository userRepository;
    @Mock private SkillRepository skillRepository;
    @Mock private UserSkillOfferedRepository offeredRepository;
    @Mock private SessionTranscriptRepository transcriptRepository;
    @Mock private SessionNoteRepository noteRepository;
    @Mock private DtoMapper mapper;
    @Mock private ApplicationEventPublisher eventPublisher;
    @Mock private NotificationService notificationService;
    @Mock private AccountRestrictionService restrictionService;
    @Mock private CreditService creditService;
    @Mock private CertificateService certificateService;
    @Mock private ProgressService progressService;

    private SessionServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new SessionServiceImpl(
            sessionRepository,
            exchangeRepository,
            connectionRepository,
            userRepository,
            skillRepository,
            offeredRepository,
            transcriptRepository,
            noteRepository,
            mapper,
            eventPublisher,
            notificationService,
            restrictionService,
            creditService,
            certificateService,
            progressService
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
            null,
            "VIDEO"
        )));
    }

    @Test
    void createForConnection_createsProposedSessionWithoutExistingExchange() {
        User requester = user("requester", "Requester");
        User partner = user("partner", "Partner");
        Skill skill = skill("connection-meeting", "Connection Meeting");
        Connection connection = acceptedConnection("connection-1", requester, partner);

        when(connectionRepository.findPairByStatuses(eq(requester.getId()), eq(partner.getId()), anyCollection(), any()))
            .thenReturn(List.of(connection));
        when(userRepository.findById(requester.getId())).thenReturn(Optional.of(requester));
        when(userRepository.findById(partner.getId())).thenReturn(Optional.of(partner));
        when(skillRepository.findByNameIgnoreCase("Connection Meeting")).thenReturn(Optional.of(skill));
        when(sessionRepository.findActiveSessionsInWindow(eq(requester.getId()), anyCollection(), any(), any()))
            .thenReturn(List.of());
        when(sessionRepository.findActiveSessionsInWindow(eq(partner.getId()), anyCollection(), any(), any()))
            .thenReturn(List.of());
        when(exchangeRepository.save(any(Exchange.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(sessionRepository.save(any(Session.class))).thenAnswer(invocation -> invocation.getArgument(0));

        service.createForConnection(requester.getId(), new CreateConnectedSessionRequest(
            partner.getId(),
            null,
            LocalDateTime.now().plusDays(1),
            60,
            null,
            "Planning call",
            "VIDEO"
        ));

        ArgumentCaptor<Exchange> exchangeCaptor = ArgumentCaptor.forClass(Exchange.class);
        verify(exchangeRepository).save(exchangeCaptor.capture());
        assertEquals(Exchange.ExchangeMode.TEST_MEETING, exchangeCaptor.getValue().getExchangeMode());
        assertEquals(Exchange.ExchangeStatus.ACCEPTED, exchangeCaptor.getValue().getStatus());

        ArgumentCaptor<Session> sessionCaptor = ArgumentCaptor.forClass(Session.class);
        verify(sessionRepository).save(sessionCaptor.capture());
        Session saved = sessionCaptor.getValue();
        assertEquals(requester.getId(), saved.getTeacher().getId());
        assertEquals(partner.getId(), saved.getLearner().getId());
        assertEquals(skill.getId(), saved.getSkill().getId());
        assertEquals(Session.SessionStatus.PROPOSED, saved.getStatus());
    }

    @Test
    void createForConnection_reportsConfigurationErrorWhenConnectionMeetingSkillMissing() {
        User requester = user("requester", "Requester");
        User partner = user("partner", "Partner");
        Connection connection = acceptedConnection("connection-1", requester, partner);

        when(connectionRepository.findPairByStatuses(eq(requester.getId()), eq(partner.getId()), anyCollection(), any()))
            .thenReturn(List.of(connection));
        when(userRepository.findById(requester.getId())).thenReturn(Optional.of(requester));
        when(userRepository.findById(partner.getId())).thenReturn(Optional.of(partner));
        when(skillRepository.findByNameIgnoreCase("Connection Meeting")).thenReturn(Optional.empty());

        IllegalStateException error = assertThrows(IllegalStateException.class, () ->
            service.createForConnection(requester.getId(), new CreateConnectedSessionRequest(
                partner.getId(),
                null,
                LocalDateTime.now().plusDays(1),
                60,
                null,
                null,
                "VIDEO"
            ))
        );

        assertEquals(
            "Connection meeting skill is not configured. Restart the backend so database migrations can run.",
            error.getMessage()
        );
        verify(exchangeRepository, never()).save(any(Exchange.class));
        verify(sessionRepository, never()).save(any(Session.class));
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
            null,
            "VIDEO"
        )));
    }

    @Test
    void markCompleted_doesNotPublishRewardsAgainWhenAlreadyCompleted() {
        User teacher = user("teacher", "Teacher");
        User learner = user("learner", "Learner");
        Skill skill = skill("python", "Python");
        Exchange exchange = acceptedExchange("exchange-1", teacher, learner, skill, null);

        Session session = new Session();
        session.setId("session-completed");
        session.setExchange(exchange);
        session.setTeacher(teacher);
        session.setLearner(learner);
        session.setSkill(skill);
        session.setStatus(Session.SessionStatus.COMPLETED);

        when(sessionRepository.findById(session.getId())).thenReturn(Optional.of(session));

        service.markCompleted(session.getId(), teacher.getId());

        verify(sessionRepository, never()).save(any(Session.class));
        verify(eventPublisher, never()).publishEvent(any());
        verify(creditService, never()).rewardTeachingSession(any(), any(), anyInt(), any());
        verify(certificateService, never()).evaluateAfterSession(any());
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

    private static Connection acceptedConnection(String id, User requester, User receiver) {
        Connection connection = new Connection();
        connection.setId(id);
        connection.setRequester(requester);
        connection.setReceiver(receiver);
        connection.setStatus(Connection.ConnectionStatus.ACCEPTED);
        return connection;
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
