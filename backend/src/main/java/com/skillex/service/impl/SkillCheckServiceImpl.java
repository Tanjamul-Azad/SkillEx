package com.skillex.service.impl;

import com.skillex.dto.common.PagedResponse;
import com.skillex.dto.skillcheck.CreateSkillCheckRequest;
import com.skillex.dto.skillcheck.SkillCheckFeedbackRequest;
import com.skillex.dto.skillcheck.SkillCheckMeetingDto;
import com.skillex.model.Skill;
import com.skillex.model.SkillCheckFeedback;
import com.skillex.model.SkillCheckMeeting;
import com.skillex.model.User;
import com.skillex.repository.SkillCheckFeedbackRepository;
import com.skillex.repository.SkillCheckMeetingRepository;
import com.skillex.repository.SkillRepository;
import com.skillex.repository.UserRepository;
import com.skillex.repository.UserSkillOfferedRepository;
import com.skillex.service.AccountRestrictionService;
import com.skillex.service.CreditService;
import com.skillex.service.DtoMapper;
import com.skillex.service.SkillCheckService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class SkillCheckServiceImpl implements SkillCheckService {
    private final SkillCheckMeetingRepository meetingRepository;
    private final SkillCheckFeedbackRepository feedbackRepository;
    private final UserRepository userRepository;
    private final SkillRepository skillRepository;
    private final UserSkillOfferedRepository offeredRepository;
    private final DtoMapper mapper;
    private final AccountRestrictionService restrictionService;
    private final CreditService creditService;

    @Override
    @Transactional
    public SkillCheckMeetingDto create(String requesterId, CreateSkillCheckRequest request) {
        restrictionService.assertCanUseAccount(requesterId, "SESSION");
        User requester = findUser(requesterId);
        User target = findUser(request.targetUserId());
        if (requester.getId().equals(target.getId())) {
            throw new IllegalArgumentException("You cannot request a skill check with yourself.");
        }
        Skill skill = skillRepository.findById(request.skillId()).orElseThrow(() -> new EntityNotFoundException("Skill not found: " + request.skillId()));
        if (!offeredRepository.existsByIdUserIdAndIdSkillId(target.getId(), skill.getId())) {
            throw new IllegalArgumentException("This user does not list that skill as teachable.");
        }
        SkillCheckMeeting meeting = SkillCheckMeeting.builder()
            .requester(requester)
            .targetUser(target)
            .skill(skill)
            .message(request.message())
            .scheduledAt(request.scheduledAt())
            .build();
        return toDto(meetingRepository.save(meeting));
    }

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<SkillCheckMeetingDto> listForUser(String userId, int page, int size) {
        return PagedResponse.of(meetingRepository.findByUser(userId, PageRequest.of(page, size)).map(this::toDto));
    }

    @Override
    @Transactional
    public SkillCheckMeetingDto addFeedback(String userId, String meetingId, SkillCheckFeedbackRequest request) {
        SkillCheckMeeting meeting = meetingRepository.findById(meetingId)
            .orElseThrow(() -> new EntityNotFoundException("Skill check meeting not found: " + meetingId));
        boolean isParticipant = meeting.getRequester().getId().equals(userId) || meeting.getTargetUser().getId().equals(userId);
        if (!isParticipant) {
            throw new AccessDeniedException("You are not a participant in this skill check.");
        }
        if (feedbackRepository.existsByMeetingIdAndReviewerId(meetingId, userId)) {
            throw new IllegalArgumentException("You already submitted feedback for this skill check.");
        }
        User reviewer = findUser(userId);
        User target = meeting.getRequester().getId().equals(userId) ? meeting.getTargetUser() : meeting.getRequester();
        SkillCheckFeedback.SkillCheckOutcome outcome = SkillCheckFeedback.SkillCheckOutcome.valueOf(request.outcome().toUpperCase());
        feedbackRepository.save(SkillCheckFeedback.builder()
            .meeting(meeting)
            .reviewer(reviewer)
            .targetUser(target)
            .outcome(outcome)
            .comment(request.comment())
            .build());
        meeting.setChecklistIntro(true);
        meeting.setChecklistDemo(true);
        meeting.setChecklistGoalAlignment(true);
        meeting.setChecklistScheduleFit(true);
        if (feedbackRepository.countByMeetingId(meetingId) >= 2) {
            meeting.setStatus(SkillCheckMeeting.SkillCheckStatus.COMPLETED);
            creditService.rewardSkillCheck(meeting.getRequester().getId(), 2, "Skill check participation reward");
            creditService.rewardSkillCheck(meeting.getTargetUser().getId(), 2, "Skill check participation reward");
        }
        return toDto(meetingRepository.save(meeting));
    }

    private SkillCheckMeetingDto toDto(SkillCheckMeeting meeting) {
        Skill skill = meeting.getSkill();
        String requesterOutcome = feedbackRepository.findByMeetingIdAndReviewerId(
                meeting.getId(),
                meeting.getRequester().getId()
            )
            .map(feedback -> feedback.getOutcome().name())
            .orElse(null);
        String targetOutcome = feedbackRepository.findByMeetingIdAndReviewerId(
                meeting.getId(),
                meeting.getTargetUser().getId()
            )
            .map(feedback -> feedback.getOutcome().name())
            .orElse(null);
        return new SkillCheckMeetingDto(
            meeting.getId(),
            mapper.toSummary(meeting.getRequester()),
            mapper.toSummary(meeting.getTargetUser()),
            new SkillCheckMeetingDto.SkillRef(skill.getId(), skill.getName(), skill.getIcon(), skill.getCategory()),
            meeting.getStatus().name(),
            requesterOutcome,
            targetOutcome,
            Boolean.TRUE.equals(meeting.getChecklistIntro()),
            Boolean.TRUE.equals(meeting.getChecklistDemo()),
            Boolean.TRUE.equals(meeting.getChecklistGoalAlignment()),
            Boolean.TRUE.equals(meeting.getChecklistScheduleFit()),
            meeting.getMessage(),
            meeting.getScheduledAt(),
            meeting.getCreatedAt()
        );
    }

    private User findUser(String id) {
        return userRepository.findById(id).orElseThrow(() -> new EntityNotFoundException("User not found: " + id));
    }
}
