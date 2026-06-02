package com.skillex.service;

import com.skillex.model.Connection;
import com.skillex.model.Discussion;
import com.skillex.model.DiscussionReply;
import com.skillex.model.Event;
import com.skillex.model.EventRsvp;
import com.skillex.model.Skill;
import com.skillex.model.SkillCircle;
import com.skillex.model.User;
import com.skillex.repository.ConnectionRepository;
import com.skillex.repository.EventRsvpRepository;
import com.skillex.repository.UserSkillOfferedRepository;
import com.skillex.repository.UserSkillWantedRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class CommunityNotificationService {

    private final NotificationService notificationService;
    private final ConnectionRepository connectionRepository;
    private final UserSkillOfferedRepository offeredRepository;
    private final UserSkillWantedRepository wantedRepository;
    private final EventRsvpRepository eventRsvpRepository;

    public void notifyEventCreated(Event event) {
        String hostId = event.getHost().getId();
        Set<String> recipients = new LinkedHashSet<>();

        if (event.getCircle() != null) {
            event.getCircle().getMembers().stream()
                .map(User::getId)
                .forEach(recipients::add);
        }

        List<String> skillIds = event.getSkills().stream().map(Skill::getId).toList();
        if (!skillIds.isEmpty()) {
            recipients.addAll(offeredRepository.findUserIdsBySkillIds(skillIds));
            recipients.addAll(wantedRepository.findUserIdsBySkillIds(skillIds));
        }

        recipients.addAll(connectionRepository.findConnectedUserIds(hostId, Connection.ConnectionStatus.ACCEPTED));
        recipients.remove(hostId);

        String message = event.getHost().getName() + " created " + readableEventType(event) + ": " + event.getTitle();
        notifyMany(recipients, hostId, "COMMUNITY_EVENT", message, "EVENT", event.getId(), eventUrl(event.getId()));
    }

    public void notifyEventUpdated(Event event, String actorId, String message) {
        Set<String> recipients = new LinkedHashSet<>(eventRsvpRepository.findUserIdsByEventAndStates(
            event.getId(),
            List.of(EventRsvp.RsvpState.INTERESTED, EventRsvp.RsvpState.GOING)
        ));
        recipients.remove(actorId);
        notifyMany(recipients, actorId, "COMMUNITY_EVENT", message, "EVENT", event.getId(), eventUrl(event.getId()));
    }

    public void notifyCircleActivity(SkillCircle circle, String actorId, String message) {
        Set<String> recipients = new LinkedHashSet<>();
        circle.getMembers().stream().map(User::getId).forEach(recipients::add);
        recipients.remove(actorId);
        notifyMany(recipients, actorId, "CIRCLE_ACTIVITY", message, "CIRCLE", circle.getId(), circleUrl(circle.getId()));
    }

    public void notifyDiscussionReply(Discussion discussion, DiscussionReply reply) {
        String authorId = reply.getAuthor().getId();
        String discussionOwnerId = discussion.getAuthor().getId();
        if (!authorId.equals(discussionOwnerId)) {
            notificationService.create(
                discussionOwnerId,
                authorId,
                "DISCUSSION_REPLY",
                reply.getAuthor().getName() + " replied to your discussion: " + discussion.getTitle(),
                "DISCUSSION",
                discussion.getId(),
                discussionUrl(discussion.getId())
            );
        }
    }

    public void notifyAnswerAccepted(Discussion discussion, DiscussionReply acceptedReply, String actorId) {
        String replyAuthorId = acceptedReply.getAuthor().getId();
        if (!replyAuthorId.equals(actorId)) {
            notificationService.create(
                replyAuthorId,
                actorId,
                "DISCUSSION_REPLY",
                "Your answer was accepted: " + discussion.getTitle(),
                "DISCUSSION",
                discussion.getId(),
                discussionUrl(discussion.getId())
            );
        }
    }

    private void notifyMany(
        Set<String> userIds,
        String fromUserId,
        String type,
        String message,
        String targetType,
        String targetId,
        String actionUrl
    ) {
        for (String userId : userIds) {
            try {
                notificationService.create(userId, fromUserId, type, message, targetType, targetId, actionUrl);
            } catch (RuntimeException ex) {
                log.debug("Failed to create community notification for user {}: {}", userId, ex.getMessage());
            }
        }
    }

    private String readableEventType(Event event) {
        String raw = event.getEventType() == null ? "event" : event.getEventType().name().toLowerCase().replace('_', ' ');
        return "a " + raw;
    }

    private String eventUrl(String eventId) {
        return "/community?tab=events&eventId=" + eventId;
    }

    private String circleUrl(String circleId) {
        return "/community?tab=circles&circleId=" + circleId;
    }

    private String discussionUrl(String discussionId) {
        return "/community?tab=discussions&discussionId=" + discussionId;
    }
}
