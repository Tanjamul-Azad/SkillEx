package com.skillex.service.impl;

import com.skillex.dto.ai.GroupSessionDto;
import com.skillex.model.Skill;
import com.skillex.model.User;
import com.skillex.model.SkillCertificate;
import com.skillex.repository.*;
import com.skillex.service.GroupSessionService;
import com.skillex.service.CertificateService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class GroupSessionServiceImpl implements GroupSessionService {
    private final UserRepository userRepository;
    private final SkillRepository skillRepository;
    private final CertificateService certificateService;

    // In-memory store for demo (production uses DB entity)
    private final Map<String, GroupSessionData> sessions = new java.util.concurrent.ConcurrentHashMap<>();

    @Override
    public GroupSessionDto create(String userId, GroupSessionDto.CreateRequest request) {
        User mentor = userRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("User not found"));

        Skill skill = skillRepository.findById(request.skillId())
            .orElseThrow(() -> new IllegalArgumentException("Skill not found"));

        String sessionId = UUID.randomUUID().toString();
        GroupSessionData data = new GroupSessionData(
            sessionId,
            mentor.getId(),
            mentor.getName(),
            mentor.getAvatar(),
            skill.getId(),
            skill.getName(),
            request.title(),
            request.description(),
            request.scheduledAt(),
            request.durationMinutes(),
            request.maxAttendees(),
            new ArrayList<>(),
            "SCHEDULED",
            "",
            LocalDateTime.now()
        );

        sessions.put(sessionId, data);

        return convertToDto(data);
    }

    @Override
    public void joinSession(String learnerUserId, String sessionId) {
        GroupSessionData session = sessions.get(sessionId);
        if (session == null) {
            throw new IllegalArgumentException("Session not found");
        }

        User learner = userRepository.findById(learnerUserId)
            .orElseThrow(() -> new IllegalArgumentException("User not found"));

        // Check if already joined
        if (session.attendees.stream().anyMatch(a -> a.userId().equals(learnerUserId))) {
            return; // Already joined
        }

        // Check capacity
        if (session.attendees.size() >= session.maxAttendees()) {
            throw new IllegalArgumentException("Session is full");
        }

        // Add attendee
        GroupSessionDto.Attendee attendee = new GroupSessionDto.Attendee(
            learner.getId(),
            learner.getName(),
            learner.getAvatar(),
            LocalDateTime.now(),
            false
        );

        session.attendees.add(attendee);
    }

    @Override
    @Transactional(readOnly = true)
    public GroupSessionDto getSession(String sessionId) {
        GroupSessionData data = sessions.get(sessionId);
        if (data == null) {
            throw new IllegalArgumentException("Session not found");
        }
        return convertToDto(data);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<GroupSessionDto> listActive(Pageable pageable) {
        List<GroupSessionDto> active = sessions.values().stream()
            .filter(s -> "SCHEDULED".equals(s.status) || "IN_PROGRESS".equals(s.status))
            .map(this::convertToDto)
            .sorted(Comparator.comparing(GroupSessionDto::scheduledAt))
            .collect(Collectors.toList());

        int start = (int) pageable.getOffset();
        int end = Math.min(start + pageable.getPageSize(), active.size());

        return new PageImpl<>(
            active.subList(start, end),
            pageable,
            active.size()
        );
    }

    @Override
    @Transactional(readOnly = true)
    public Page<GroupSessionDto> listUserSessions(String userId, Pageable pageable) {
        List<GroupSessionDto> userSessions = sessions.values().stream()
            .filter(s -> s.mentorId().equals(userId) ||
                    s.attendees.stream().anyMatch(a -> a.userId().equals(userId)))
            .map(this::convertToDto)
            .sorted(Comparator.comparing(GroupSessionDto::scheduledAt).reversed())
            .collect(Collectors.toList());

        int start = (int) pageable.getOffset();
        int end = Math.min(start + pageable.getPageSize(), userSessions.size());

        return new PageImpl<>(
            userSessions.subList(start, end),
            pageable,
            userSessions.size()
        );
    }

    @Override
    public void completeSes sion(String sessionId, String mentorNotes) {
        GroupSessionData session = sessions.get(sessionId);
        if (session == null) {
            throw new IllegalArgumentException("Session not found");
        }

        session.status = "COMPLETED";
        session.sharedNotes = mentorNotes;
    }

    @Override
    public GroupSessionDto.GroupCertificate generateCertificate(String sessionId, String learnerUserId) {
        GroupSessionData session = sessions.get(sessionId);
        if (session == null) {
            throw new IllegalArgumentException("Session not found");
        }

        User learner = userRepository.findById(learnerUserId)
            .orElseThrow(() -> new IllegalArgumentException("Learner not found"));

        // In production, create a SkillCertificate entity
        // For now, return certificate data
        return new GroupSessionDto.GroupCertificate(
            UUID.randomUUID().toString(),
            learnerUserId,
            learner.getName(),
            session.skillName,
            sessionId,
            session.mentorName,
            session.attendees.size(),
            LocalDateTime.now(),
            "https://certificates.skillex.dev/" + UUID.randomUUID().toString()
        );
    }

    private GroupSessionDto convertToDto(GroupSessionData data) {
        return new GroupSessionDto(
            data.id,
            data.mentorId,
            data.mentorName,
            data.mentorAvatar,
            data.skillId,
            data.skillName,
            data.title,
            data.description,
            data.scheduledAt,
            data.durationMinutes,
            data.maxAttendees,
            data.attendees,
            data.status,
            data.sharedNotes,
            data.createdAt
        );
    }

    // Simple data class (production would use @Entity)
    private static class GroupSessionData {
        String id;
        String mentorId;
        String mentorName;
        String mentorAvatar;
        String skillId;
        String skillName;
        String title;
        String description;
        LocalDateTime scheduledAt;
        int durationMinutes;
        int maxAttendees;
        List<GroupSessionDto.Attendee> attendees;
        String status;
        String sharedNotes;
        LocalDateTime createdAt;

        GroupSessionData(String id, String mentorId, String mentorName, String mentorAvatar,
                        String skillId, String skillName, String title, String description,
                        LocalDateTime scheduledAt, int durationMinutes, int maxAttendees,
                        List<GroupSessionDto.Attendee> attendees, String status,
                        String sharedNotes, LocalDateTime createdAt) {
            this.id = id;
            this.mentorId = mentorId;
            this.mentorName = mentorName;
            this.mentorAvatar = mentorAvatar;
            this.skillId = skillId;
            this.skillName = skillName;
            this.title = title;
            this.description = description;
            this.scheduledAt = scheduledAt;
            this.durationMinutes = durationMinutes;
            this.maxAttendees = maxAttendees;
            this.attendees = attendees;
            this.status = status;
            this.sharedNotes = sharedNotes;
            this.createdAt = createdAt;
        }
    }
}
