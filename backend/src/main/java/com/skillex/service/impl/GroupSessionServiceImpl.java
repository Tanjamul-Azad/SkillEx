package com.skillex.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.skillex.dto.ai.GroupSessionDto;
import com.skillex.model.GroupSession;
import com.skillex.model.GroupSessionAttendee;
import com.skillex.model.Skill;
import com.skillex.model.SkillCertificate;
import com.skillex.model.SkillTrustScore;
import com.skillex.model.User;
import com.skillex.repository.GroupSessionRepository;
import com.skillex.repository.SkillCertificateRepository;
import com.skillex.repository.SkillRepository;
import com.skillex.repository.SkillTrustScoreRepository;
import com.skillex.repository.UserRepository;
import com.skillex.service.GroupSessionService;
import com.skillex.service.NoteGenerationService;
import com.skillex.service.NotificationService;
import com.skillex.service.ProgressService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class GroupSessionServiceImpl implements GroupSessionService {
    private final GroupSessionRepository groupSessionRepository;
    private final UserRepository userRepository;
    private final SkillRepository skillRepository;
    private final SkillCertificateRepository certificateRepository;
    private final SkillTrustScoreRepository trustScoreRepository;
    private final NotificationService notificationService;
    private final ProgressService progressService;
    private final NoteGenerationService noteGenerationService;
    private final ObjectMapper objectMapper;

    private static final List<String> ACTIVE_STATUSES = List.of("SCHEDULED", "IN_PROGRESS");

    @Override
    public GroupSessionDto create(String userId, GroupSessionDto.CreateRequest request) {
        User mentor = userRepository.findById(userId)
            .orElseThrow(() -> new EntityNotFoundException("User not found"));
        Skill skill = skillRepository.findById(request.skillId())
            .orElseThrow(() -> new EntityNotFoundException("Skill not found: " + request.skillId()));
        assertMentorTeachesSkill(mentor, skill);

        if (request.title() == null || request.title().isBlank()) {
            throw new IllegalArgumentException("Session title is required.");
        }
        if (request.scheduledAt() == null || request.scheduledAt().isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("Session must be scheduled in the future.");
        }
        int maxAttendees = Math.min(Math.max(request.maxAttendees(), 2), 100);
        int duration = Math.min(Math.max(request.durationMinutes(), 15), 480);

        GroupSession session = GroupSession.builder()
            .mentor(mentor)
            .skill(skill)
            .title(request.title().trim())
            .description(request.description() == null ? null : request.description().trim())
            .scheduledAt(request.scheduledAt())
            .durationMinutes(duration)
            .maxAttendees(maxAttendees)
            .status("SCHEDULED")
            .coverImageUrl(request.coverImageUrl() == null ? null : request.coverImageUrl().trim())
            .build();

        GroupSession saved = groupSessionRepository.save(session);
        progressService.awardXp(userId, "GROUP_SESSION_CREATED", saved.getId(), 12, "Published a group workshop.");
        return toDto(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public GroupSessionDto.WorkshopDraft generateWorkshopDraft(String userId, GroupSessionDto.AiDraftRequest request) {
        if (request == null || request.skillId() == null || request.skillId().isBlank()) {
            throw new IllegalArgumentException("Skill is required.");
        }
        User mentor = userRepository.findById(userId)
            .orElseThrow(() -> new EntityNotFoundException("User not found"));
        Skill skill = skillRepository.findById(request.skillId())
            .orElseThrow(() -> new EntityNotFoundException("Skill not found: " + request.skillId()));
        assertMentorTeachesSkill(mentor, skill);

        String level = request.audienceLevel() == null || request.audienceLevel().isBlank()
            ? "beginner to intermediate"
            : request.audienceLevel().trim();
        String goal = request.goal() == null || request.goal().isBlank()
            ? "help learners leave with one practical result"
            : request.goal().trim();

        String prompt = String.format("""
            You are SkillEX's AI workshop producer.

            Mentor: %s
            Skill: %s
            Skill category: %s
            Audience level: %s
            Workshop goal: %s

            Generate a publish-ready group session draft.
            Rules:
            - Return ONLY valid JSON. No markdown.
            - Title must be specific and under 80 characters.
            - Description must be 2 to 4 concise sentences.
            - Agenda, prerequisites, and takeaways should be newline-friendly text.
            - Duration must be one of 45, 60, 75, 90, or 120.
            - Max attendees should be 5 to 20 based on hands-on intensity.

            JSON schema:
            {
              "title": "Workshop title",
              "description": "Short publishable description",
              "durationMinutes": 60,
              "maxAttendees": 10,
              "agenda": "1. ...\\n2. ...",
              "prerequisites": "What learners should know or prepare",
              "takeaways": "What learners will be able to do"
            }
            """, mentor.getName(), skill.getName(), skill.getCategory(), level, goal);

        String response = noteGenerationService.generateWithOllama(prompt);
        try {
            JsonNode root = objectMapper.readTree(extractJsonObject(response));
            String title = root.path("title").asText("").trim();
            String description = root.path("description").asText("").trim();
            String agenda = root.path("agenda").asText("").trim();
            String prerequisites = root.path("prerequisites").asText("").trim();
            String takeaways = root.path("takeaways").asText("").trim();
            int duration = normalizeDuration(root.path("durationMinutes").asInt(60));
            int seats = Math.max(5, Math.min(root.path("maxAttendees").asInt(10), 20));

            if (title.isBlank() || description.isBlank()) {
                return fallbackDraft(skill, level);
            }
            return new GroupSessionDto.WorkshopDraft(
                title,
                description,
                duration,
                seats,
                agenda.isBlank() ? defaultAgenda(skill.getName()) : agenda,
                prerequisites.isBlank() ? "Basic curiosity about " + skill.getName() + "." : prerequisites,
                takeaways.isBlank() ? "A practical next step in " + skill.getName() + "." : takeaways
            );
        } catch (Exception e) {
            return fallbackDraft(skill, level);
        }
    }

    @Override
    public void joinSession(String learnerUserId, String sessionId) {
        GroupSession session = findSession(sessionId);

        if (!ACTIVE_STATUSES.contains(session.getStatus())) {
            throw new IllegalArgumentException("This session is no longer open for enrollment.");
        }
        if (session.getMentor().getId().equals(learnerUserId)) {
            throw new IllegalArgumentException("You are hosting this session.");
        }
        boolean alreadyJoined = session.getAttendees().stream()
            .anyMatch(a -> a.getUser().getId().equals(learnerUserId));
        if (alreadyJoined) {
            return;
        }
        if (session.getAttendees().size() >= session.getMaxAttendees()) {
            throw new IllegalArgumentException("Session is full.");
        }

        User learner = userRepository.findById(learnerUserId)
            .orElseThrow(() -> new EntityNotFoundException("User not found"));

        session.getAttendees().add(GroupSessionAttendee.builder()
            .groupSession(session)
            .user(learner)
            .build());
        groupSessionRepository.save(session);

        notificationService.create(
            session.getMentor().getId(),
            learnerUserId,
            "SYSTEM_UPDATE",
            learner.getName() + " joined your group session \"" + session.getTitle() + "\".",
            "GROUP_SESSION",
            session.getId(),
            "/group-sessions"
        );
        progressService.awardXp(learnerUserId, "GROUP_SESSION_JOINED", session.getId(), 5, "Joined a group learning session.");
    }

    @Override
    public void leaveSession(String learnerUserId, String sessionId) {
        GroupSession session = findSession(sessionId);
        if (!ACTIVE_STATUSES.contains(session.getStatus())) {
            throw new IllegalArgumentException("This session can no longer be left.");
        }
        session.getAttendees().removeIf(a -> a.getUser().getId().equals(learnerUserId));
        groupSessionRepository.save(session);
    }

    @Override
    @Transactional(readOnly = true)
    public GroupSessionDto getSession(String sessionId) {
        return toDto(findSession(sessionId));
    }

    @Override
    @Transactional(readOnly = true)
    public Page<GroupSessionDto> listActive(Pageable pageable) {
        return groupSessionRepository
            .findByStatusInOrderByScheduledAtAsc(ACTIVE_STATUSES, pageable)
            .map(this::toDto);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<GroupSessionDto> listUserSessions(String userId, Pageable pageable) {
        return groupSessionRepository.findUserSessions(userId, pageable).map(this::toDto);
    }

    @Override
    public void completeSession(String mentorId, String sessionId, String mentorNotes) {
        GroupSession session = findSession(sessionId);
        assertMentor(session, mentorId);
        if (!ACTIVE_STATUSES.contains(session.getStatus())) {
            throw new IllegalArgumentException("Only scheduled or in-progress sessions can be completed.");
        }

        session.setStatus("COMPLETED");
        session.setSharedNotes(mentorNotes);
        groupSessionRepository.save(session);

        for (GroupSessionAttendee attendee : session.getAttendees()) {
            notificationService.create(
                attendee.getUser().getId(),
                mentorId,
                "SYSTEM_UPDATE",
                "\"" + session.getTitle() + "\" wrapped up - your certificate is ready to claim.",
                "GROUP_SESSION",
                session.getId(),
                "/group-sessions"
            );
            progressService.awardXp(attendee.getUser().getId(), "GROUP_SESSION_ATTENDED", session.getId(), 20, "Completed group session: " + session.getTitle() + ".");
        }
        progressService.awardXp(mentorId, "GROUP_SESSION_HOSTED", session.getId(), 45, "Hosted group session: " + session.getTitle() + ".");
    }

    @Override
    public void startSession(String mentorId, String sessionId, String meetingLink) {
        GroupSession session = findSession(sessionId);
        assertMentor(session, mentorId);
        if (!"SCHEDULED".equals(session.getStatus()) && !"IN_PROGRESS".equals(session.getStatus())) {
            throw new IllegalArgumentException("Only scheduled or in-progress sessions can be updated.");
        }
        if ("SCHEDULED".equals(session.getStatus())) {
            session.setStatus("IN_PROGRESS");
            session.setStartedAt(LocalDateTime.now());
        }
        session.setMeetingLink(meetingLink);
        groupSessionRepository.save(session);

        for (GroupSessionAttendee attendee : session.getAttendees()) {
            notificationService.create(
                attendee.getUser().getId(),
                mentorId,
                "SYSTEM_UPDATE",
                "Group session \"" + session.getTitle() + "\" is live now! Join the room.",
                "GROUP_SESSION",
                session.getId(),
                "/group-sessions/" + session.getId()
            );
        }
    }

    @Override
    public void cancelSession(String mentorId, String sessionId) {
        GroupSession session = findSession(sessionId);
        assertMentor(session, mentorId);
        if (!ACTIVE_STATUSES.contains(session.getStatus())) {
            throw new IllegalArgumentException("Only scheduled or in-progress sessions can be cancelled.");
        }

        session.setStatus("CANCELLED");
        groupSessionRepository.save(session);

        for (GroupSessionAttendee attendee : session.getAttendees()) {
            notificationService.create(
                attendee.getUser().getId(),
                mentorId,
                "SYSTEM_UPDATE",
                "Group session \"" + session.getTitle() + "\" was cancelled by the host.",
                "GROUP_SESSION",
                session.getId(),
                "/group-sessions"
            );
        }
    }

    @Override
    public GroupSessionDto.GroupCertificate generateCertificate(String sessionId, String learnerUserId) {
        GroupSession session = findSession(sessionId);
        if (!"COMPLETED".equals(session.getStatus())) {
            throw new IllegalArgumentException("Certificates are issued after the session is completed.");
        }

        GroupSessionAttendee attendee = session.getAttendees().stream()
            .filter(a -> a.getUser().getId().equals(learnerUserId))
            .findFirst()
            .orElseThrow(() -> new AccessDeniedException("Only attendees can claim a certificate."));

        User learner = attendee.getUser();
        Skill skill = session.getSkill();

        SkillCertificate certificate = certificateRepository
            .findByUserIdAndSkillIdAndCertificateType(
                learnerUserId, skill.getId(), SkillCertificate.CertificateType.SKILL_LEARNER)
            .orElseGet(() -> issueLearnerCertificate(learner, skill, session));

        if (!attendee.isCertificateEarned()) {
            attendee.setCertificateEarned(true);
            groupSessionRepository.save(session);
            progressService.awardXp(learnerUserId, "GROUP_CERTIFICATE_CLAIMED", certificate.getId(), 15, "Claimed a certificate for " + session.getTitle() + ".");
        }

        return new GroupSessionDto.GroupCertificate(
            certificate.getId(),
            learnerUserId,
            learner.getName(),
            skill.getName(),
            session.getId(),
            session.getMentor().getName(),
            session.getAttendees().size(),
            certificate.getIssuedAt(),
            "/verify/certificate/" + certificate.getVerificationCode()
        );
    }

    // helpers

    private GroupSession findSession(String sessionId) {
        return groupSessionRepository.findById(sessionId)
            .orElseThrow(() -> new EntityNotFoundException("Group session not found: " + sessionId));
    }

    private void assertMentor(GroupSession session, String userId) {
        if (!session.getMentor().getId().equals(userId)) {
            throw new AccessDeniedException("Only the hosting mentor can manage this session.");
        }
    }

    private void assertMentorTeachesSkill(User mentor, Skill skill) {
        boolean teachesSkill = mentor.getSkillsOffered() != null
            && mentor.getSkillsOffered().stream()
                .anyMatch(offered -> offered.getId().equals(skill.getId()));
        if (!teachesSkill) {
            throw new AccessDeniedException("You can only host workshops for skills you teach.");
        }
    }

    private SkillCertificate issueLearnerCertificate(User learner, Skill skill, GroupSession session) {
        int trustScore = trustScoreRepository
            .findByUserIdAndSkillId(learner.getId(), skill.getId())
            .map(s -> s.getScore() == null ? 0 : s.getScore())
            .orElse(0);

        SkillCertificate certificate = SkillCertificate.builder()
            .user(learner)
            .skill(skill)
            .certificateType(SkillCertificate.CertificateType.SKILL_LEARNER)
            .title("Workshop Completion in " + skill.getName())
            .levelLabel("Group Session")
            .trustScoreSnapshot(trustScore)
            .sessionCountSnapshot(1)
            .averageRatingSnapshot(BigDecimal.ZERO.setScale(2))
            .verificationCode("SKX-GROUP-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
            .status(SkillCertificate.CertificateStatus.ACTIVE)
            .issuedAt(LocalDateTime.now())
            .build();
        certificate = certificateRepository.save(certificate);

        notificationService.create(
            learner.getId(),
            null,
            "SYSTEM_UPDATE",
            "You earned a certificate for completing \"" + session.getTitle() + "\".",
            "CERTIFICATE",
            certificate.getId(),
            "/certificates?certificateId=" + certificate.getId()
        );
        return certificate;
    }

    private String extractJsonObject(String response) {
        if (response == null || response.isBlank()) {
            return "{}";
        }
        int start = response.indexOf('{');
        int end = response.lastIndexOf('}');
        if (start >= 0 && end > start) {
            return response.substring(start, end + 1);
        }
        return response;
    }

    private int normalizeDuration(int minutes) {
        int[] allowed = {45, 60, 75, 90, 120};
        int best = allowed[0];
        int bestDelta = Math.abs(minutes - best);
        for (int option : allowed) {
            int delta = Math.abs(minutes - option);
            if (delta < bestDelta) {
                best = option;
                bestDelta = delta;
            }
        }
        return best;
    }

    private GroupSessionDto.WorkshopDraft fallbackDraft(Skill skill, String level) {
        String skillName = skill.getName();
        return new GroupSessionDto.WorkshopDraft(
            skillName + " Practice Lab",
            String.format(
                "A focused, mentor-led workshop for %s learners who want a practical path into %s. We will break down the core workflow, practice a small task, and leave with concrete next steps.",
                level,
                skillName
            ),
            60,
            10,
            defaultAgenda(skillName),
            "Bring a learning goal, basic familiarity with " + skillName + ", and any questions you want answered.",
            "A clearer mental model, one completed practice task, and a next-step plan for improving " + skillName + "."
        );
    }

    private String defaultAgenda(String skillName) {
        return String.format(
            "1. Set the goal and baseline for %s%n2. Walk through the core concept with examples%n3. Practice together on a small task%n4. Review common mistakes and next steps",
            skillName
        );
    }

    private GroupSessionDto toDto(GroupSession session) {
        return new GroupSessionDto(
            session.getId(),
            session.getMentor().getId(),
            session.getMentor().getName(),
            session.getMentor().getAvatar(),
            session.getSkill().getId(),
            session.getSkill().getName(),
            session.getTitle(),
            session.getDescription(),
            session.getScheduledAt(),
            session.getDurationMinutes(),
            session.getMaxAttendees(),
            session.getAttendees().stream()
                .map(a -> new GroupSessionDto.Attendee(
                    a.getUser().getId(),
                    a.getUser().getName(),
                    a.getUser().getAvatar(),
                    a.getJoinedAt(),
                    a.isCertificateEarned()))
                .toList(),
            session.getStatus(),
            session.getSharedNotes(),
            session.getCreatedAt(),
            session.getCoverImageUrl(),
            session.getMeetingLink(),
            session.getStartedAt()
        );
    }
}
