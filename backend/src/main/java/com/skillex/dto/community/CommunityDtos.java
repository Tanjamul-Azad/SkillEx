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
        int upvotes,
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
        int likes,
        int comments,
        int shares,
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
        String icon,
        int memberCount,
        LocalDateTime lastSession,
        String activity,
        List<SkillRef> skills,
        List<UserSummaryDto> members
    ) {}

    public record SkillRef(String id, String name, String icon, String category) {}
}
