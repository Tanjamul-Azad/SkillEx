package com.skillex.service;

import com.skillex.dto.user.UserSummaryDto;
import com.skillex.dto.user.UserProfileDto;
import com.skillex.dto.connection.ConnectionDto;
import com.skillex.dto.exchange.ExchangeDto;
import com.skillex.dto.session.SessionDto;
import com.skillex.dto.review.ReviewDto;
import com.skillex.dto.community.CommunityDtos;
import com.skillex.dto.community.CommentDto;
import com.skillex.dto.notification.NotificationDto;
import com.skillex.dto.feedback.FeedbackDto;
import com.skillex.model.*;
import com.skillex.repository.UserSkillOfferedRepository;
import com.skillex.repository.UserSkillWantedRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Stateless mapper component that converts JPA entities → DTOs.
 *
 * OOP notes:
 *  - Single-responsibility: only mapping logic lives here
 *  - All service classes inject this via constructor to avoid code duplication
 *  - No business logic — only field mapping
 */
@Component
@RequiredArgsConstructor
public class DtoMapper {

    private final UserSkillOfferedRepository offeredRepo;
    private final UserSkillWantedRepository wantedRepo;

    // ── User ──────────────────────────────────────────────────────────────────

    public UserSummaryDto toSummary(User u) {
        return new UserSummaryDto(
            u.getId(), u.getName(), u.getUsername(), u.getAvatar(),
            u.getUniversity(), safeLevelName(u),
            safeInt(u.getSkillexScore()), safeRating(u), Boolean.TRUE.equals(u.getIsOnline())
        );
    }

    public UserProfileDto toProfile(User u) {
        // Build skill lists entirely from the junction entity rows so the result
        // is always consistent with the DB — this avoids relying on the in-memory
        // @ManyToMany collection which may be stale (e.g. right after registration).
        List<UserProfileDto.SkillWithLevel> offered = offeredRepo.findByIdUserId(u.getId()).stream()
            .map(r -> {
                Skill s = r.getSkill();
                return new UserProfileDto.SkillWithLevel(
                    s.getId(), s.getName(), s.getIcon(), s.getCategory(), s.getDescription(),
                    r.getLevel().name(), r.getProofVideoUrl(), r.getSubtitle());
            })
            .toList();

        List<UserProfileDto.SkillWithLevel> wanted = wantedRepo.findByIdUserId(u.getId()).stream()
            .map(r -> {
                Skill s = r.getSkill();
                return new UserProfileDto.SkillWithLevel(
                    s.getId(), s.getName(), s.getIcon(), s.getCategory(), s.getDescription(),
                    r.getLevel().name(), null, null); // wanted skills don't have proofs
            })
            .toList();

        return new UserProfileDto(
            u.getId(), u.getName(), u.getUsername(), u.getEmail(), u.getAvatar(),
            u.getUniversity(), u.getLocation(), u.getBio(),
            u.getTeachIntentText(), u.getLearnIntentText(),
            safeRoleName(u),
            safeLevelName(u),
            safeInt(u.getSkillexScore()), safeInt(u.getSessionsCompleted()),
            safeRating(u), Boolean.TRUE.equals(u.getIsOnline()), Boolean.TRUE.equals(u.getConnectionsPublic()), u.getJoinedAt(),
            offered, wanted
        );
    }

    // ── Exchange ──────────────────────────────────────────────────────────────

    public ExchangeDto toExchange(Exchange e) {
        return new ExchangeDto(
            e.getId(),
            toSummary(e.getRequester()),
            toSummary(e.getReceiver()),
            e.getOfferedSkill() == null ? null : toSkillRef(e.getOfferedSkill()),
            e.getWantedSkill()  == null ? null : toSkillRef(e.getWantedSkill()),
            e.getMessage(),
            e.getExchangeMode() == null ? "DIRECT_SWAP" : e.getExchangeMode().name(),
            e.getCreditCost() == null ? 0 : e.getCreditCost(),
            e.getStatus().name(),
            e.getSessionDate(),
            e.getCreatedAt()
        );
    }

    private ExchangeDto.SkillRef toSkillRef(Skill s) {
        return new ExchangeDto.SkillRef(s.getId(), s.getName(), s.getIcon(), s.getCategory());
    }

    // ── Connection ───────────────────────────────────────────────────────────

    public ConnectionDto toConnection(Connection c) {
        return new ConnectionDto(
            c.getId(),
            toSummary(c.getRequester()),
            toSummary(c.getReceiver()),
            c.getMessage(),
            c.getStatus().name(),
            c.getRespondedAt(),
            c.getCreatedAt()
        );
    }

    // ── Session ───────────────────────────────────────────────────────────────

    public SessionDto toSession(Session s) {
        return new SessionDto(
            s.getId(),
            s.getExchange().getId(),
            toSummary(s.getTeacher()),
            toSummary(s.getLearner()),
            new SessionDto.SkillRef(s.getSkill().getId(), s.getSkill().getName(),
                s.getSkill().getIcon(), s.getSkill().getCategory()),
            s.getScheduledAt(), s.getDurationMins(),
            s.getStatus().name(), s.getMeetLink(), s.getSharedNotes(),
            s.getProposedBy() != null ? s.getProposedBy().getId() : null,
            s.getSessionType() != null ? s.getSessionType().name() : "VIDEO",
            s.getCreatedAt()
        );
    }

    // ── Review ────────────────────────────────────────────────────────────────

    public ReviewDto toReview(Review r) {
        return new ReviewDto(
            r.getId(),
            r.getSession().getId(),
            toSummary(r.getFromUser()),
            toSummary(r.getToUser()),
            new ReviewDto.SkillRef(r.getSkill().getId(), r.getSkill().getName(), r.getSkill().getIcon()),
            r.getRating(), r.getComment(), r.getCreatedAt()
        );
    }

    // ── Feedback ──────────────────────────────────────────────────────────────

    public FeedbackDto toFeedback(Feedback f) {
        return new FeedbackDto(
            f.getId(),
            toSummary(f.getUser()),
            f.getRating(),
            f.getComment(),
            f.getCreatedAt()
        );
    }

    // ── Community ─────────────────────────────────────────────────────────────

    public CommunityDtos.EventDto toEvent(Event ev) {
        return new CommunityDtos.EventDto(
            ev.getId(), ev.getTitle(), ev.getDescription(),
            toSummary(ev.getHost()), ev.getEventDate(),
            ev.getLocation(), ev.getIsOnline(), ev.getCoverGradient(),
            ev.getSkills().stream().map(this::toSkillRefCommunity).toList(),
            ev.getAttendees().stream().map(this::toSummary).toList(),
            ev.getCreatedAt()
        );
    }

    public CommunityDtos.DiscussionDto toDiscussion(Discussion d) {
        return toDiscussion(d, false);
    }

    public CommunityDtos.DiscussionDto toDiscussion(Discussion d, boolean isUpvotedByViewer) {
        return new CommunityDtos.DiscussionDto(
            d.getId(), d.getTitle(), d.getContent(),
            toSummary(d.getAuthor()), d.getCategory(),
            d.getUpvotes(), isUpvotedByViewer, d.getReplies(), d.getViews(),
            d.getIsPinned(), d.getCreatedAt()
        );
    }

    /**
     * Maps a Post entity to PostDto WITHOUT viewer context (isLikedByViewer = false).
     * Use {@link #toPost(Post, boolean)} when viewer context is available.
     */
    public CommunityDtos.PostDto toPost(Post p) {
        return toPost(p, false);
    }

    /**
     * Maps a Post entity to PostDto WITH viewer context for isLikedByViewer.
     */
    public CommunityDtos.PostDto toPost(Post p, boolean isLikedByViewer) {
        return toPost(p, isLikedByViewer, null, 0);
    }

    public CommunityDtos.PostDto toPost(Post p, boolean isLikedByViewer, String feedReason, int feedScore) {
        return new CommunityDtos.PostDto(
            p.getId(), p.getType().name(),
            toSummary(p.getAuthor()), p.getContent(),
            p.getSkill() == null ? null : toSkillRefCommunity(p.getSkill()),
            p.getBadge(), p.getMediaUrl(), p.getLikes(), p.getComments(), p.getShares(),
            isLikedByViewer,
            feedReason,
            feedScore,
            p.getCreatedAt()
        );
    }

    public CommentDto toComment(Comment c) {
        return new CommentDto(
            c.getId(),
            toSummary(c.getAuthor()),
            c.getContent(),
            c.getCreatedAt()
        );
    }

    public CommunityDtos.StoryDto toStory(Story s) {
        return new CommunityDtos.StoryDto(
            s.getId(), toSummary(s.getUser()), s.getIsSeen(), s.getCreatedAt()
        );
    }

    public CommunityDtos.SkillCircleDto toSkillCircle(SkillCircle sc) {
        return new CommunityDtos.SkillCircleDto(
            sc.getId(), sc.getName(), sc.getIcon(),
            sc.getMemberCount(), sc.getLastSession(),
            sc.getActivity().name(),
            sc.getSkills().stream().map(this::toSkillRefCommunity).toList(),
            sc.getMembers().stream().map(this::toSummary).toList()
        );
    }

    private CommunityDtos.SkillRef toSkillRefCommunity(Skill s) {
        return new CommunityDtos.SkillRef(s.getId(), s.getName(), s.getIcon(), s.getCategory());
    }

    private String safeRoleName(User u) {
        return (u.getRole() == null ? User.UserRole.STUDENT : u.getRole()).name().toLowerCase();
    }

    private String safeLevelName(User u) {
        return (u.getLevel() == null ? User.UserLevel.NEWCOMER : u.getLevel()).name();
    }

    private int safeInt(Integer value) {
        return value == null ? 0 : value;
    }

    private java.math.BigDecimal safeRating(User u) {
        return u.getRating() == null ? java.math.BigDecimal.ZERO : u.getRating();
    }

    // ── Notification ──────────────────────────────────────────────────────────

    public NotificationDto toNotification(Notification n) {
        NotificationDto.FromUserRef fromRef = n.getFromUser() == null ? null
            : new NotificationDto.FromUserRef(
                n.getFromUser().getId(),
                n.getFromUser().getName(),
                n.getFromUser().getAvatar());
        return new NotificationDto(
            n.getId(), n.getType().name(), n.getMessage(),
            fromRef, n.getIsRead(), n.getCreatedAt()
        );
    }
}
