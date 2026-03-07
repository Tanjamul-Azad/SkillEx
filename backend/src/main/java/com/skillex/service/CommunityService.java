package com.skillex.service;

import com.skillex.dto.common.PagedResponse;
import com.skillex.dto.community.*;

import java.util.List;

/**
 * Contract for all community-related features:
 * events, discussions, posts, stories, and skill circles.
 */
public interface CommunityService {

    // ── Events ──────────────────────────────────────────────────────────────

    PagedResponse<CommunityDtos.EventDto> getEvents(int page, int size);

    CommunityDtos.EventDto createEvent(String organizerId, CreateEventRequest req);

    void attendEvent(String userId, String eventId);

    // ── Discussions ──────────────────────────────────────────────────────────

    PagedResponse<CommunityDtos.DiscussionDto> getDiscussions(int page, int size);

    CommunityDtos.DiscussionDto createDiscussion(String authorId, CreateDiscussionRequest req);

    CommunityDtos.DiscussionDto upvoteDiscussion(String userId, String discussionId);

    // ── Posts ────────────────────────────────────────────────────────────────

    PagedResponse<CommunityDtos.PostDto> getPosts(int page, int size);

    CommunityDtos.PostDto createPost(String authorId, CreatePostRequest req);

    CommunityDtos.PostDto likePost(String userId, String postId);

    // ── Stories ──────────────────────────────────────────────────────────────

    List<CommunityDtos.StoryDto> getStories();

    // ── Skill Circles ────────────────────────────────────────────────────────

    PagedResponse<CommunityDtos.SkillCircleDto> getSkillCircles(int page, int size);

    CommunityDtos.SkillCircleDto joinSkillCircle(String userId, String circleId);
}
