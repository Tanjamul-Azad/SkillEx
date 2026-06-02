package com.skillex.dto.community;

import com.skillex.dto.user.UserSummaryDto;

import java.time.LocalDateTime;
import java.util.List;

/** Response DTOs for all community entities */
public final class CommunityDtos {

    private CommunityDtos() {}

    public record EventDto(
        String id,
        String title,
        String description,
        UserSummaryDto host,
        LocalDateTime eventDate,
        String location,
        boolean isOnline,
        String eventType,
        String circleId,
        String circleName,
        String meetingUrl,
        String rsvpState,
        int interestedCount,
        int attendeeCount,
        String status,
        String coverGradient,
        List<SkillRef> skills,
        List<UserSummaryDto> attendees,
        LocalDateTime createdAt
    ) {}

    public record DiscussionDto(
        String id,
        String title,
        String content,
        UserSummaryDto author,
        String category,
        String threadType,
        SkillRef skill,
        String circleId,
        String circleName,
        String status,
        String acceptedReplyId,
        int upvotes,
        boolean isUpvotedByViewer,
        int replies,
        int views,
        boolean isPinned,
        LocalDateTime createdAt
    ) {}

    public record PostDto(
        String id,
        String type,
        UserSummaryDto author,
        String content,
        SkillRef skill,
        String badge,
        String mediaUrl,
        int likes,
        int comments,
        int shares,
        boolean isLikedByViewer,
        String feedReason,
        int feedScore,
        LocalDateTime createdAt
    ) {}

    public record StoryDto(
        String id,
        UserSummaryDto user,
        boolean isSeen,
        LocalDateTime createdAt
    ) {}

    public record SkillCircleDto(
        String id,
        String name,
        String description,
        UserSummaryDto owner,
        String memberRole,
        String icon,
        int memberCount,
        LocalDateTime lastSession,
        String activity,
        long resourceCount,
        long openHelpCount,
        long upcomingEventCount,
        List<SkillRef> skills,
        List<UserSummaryDto> members
    ) {}

    public record CircleResourceDto(
        String id,
        String circleId,
        String title,
        String url,
        String notes,
        String resourceType,
        String difficulty,
        int upvotes,
        boolean isPinned,
        boolean isVerified,
        SkillRef skill,
        UserSummaryDto author,
        LocalDateTime createdAt
    ) {}

    public record DiscussionReplyDto(
        String id,
        String discussionId,
        UserSummaryDto author,
        String content,
        boolean isAccepted,
        LocalDateTime createdAt
    ) {}

    public record SkillCircleDashboardDto(
        SkillCircleDto circle,
        EventDto nextEvent,
        List<CircleResourceDto> topResources,
        List<DiscussionDto> openHelpRequests,
        long solvedQuestions,
        int activityScore,
        String weeklyGoal
    ) {}

    public record SkillRef(String id, String name, String icon, String category) {}

    /** Used by GET /api/community/trending-skills */
    public record TrendingSkillDto(
        String id,
        String name,
        String icon,
        String category,
        long postCount,
        int growthPercent
    ) {}

    /** Used by GET /api/community/suggested-users */
    public record SuggestedUserDto(
        String id,
        String name,
        String username,
        String avatar,
        String university,
        int skillexScore,
        boolean isOnline,
        List<String> sharedSkills,
        String reason
    ) {}
}
