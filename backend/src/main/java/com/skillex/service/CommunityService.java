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

    PagedResponse<CommunityDtos.PostDto> getPosts(String viewerId, int page, int size);

    PagedResponse<CommunityDtos.PostDto> getFeed(String viewerId, String mode, String skillId, int page, int size);

    PagedResponse<CommunityDtos.PostDto> searchPostsByIntent(String viewerId, String intent, int page, int size);

    PagedResponse<CommunityDtos.PostDto> getUserPosts(String userId, int page, int size);

    CommunityDtos.PostDto createPost(String authorId, CreatePostRequest req);

    CommunityDtos.PostDto likePost(String userId, String postId);

    void deletePost(String userId, String postId);

    // ── Comments ─────────────────────────────────────────────────────────────

    PagedResponse<CommentDto> getComments(String postId, int page, int size);

    CommentDto addComment(String userId, String postId, CreateCommentRequest req);

    // ── Stories ──────────────────────────────────────────────────────────────

    List<CommunityDtos.StoryDto> getStories();

    // ── Skill Circles ────────────────────────────────────────────────────────

    PagedResponse<CommunityDtos.SkillCircleDto> getSkillCircles(int page, int size);

    CommunityDtos.SkillCircleDto createSkillCircle(String creatorId, CreateSkillCircleRequest req);

    CommunityDtos.SkillCircleDto joinSkillCircle(String userId, String circleId);

    // ── Trending & Suggestions ───────────────────────────────────────────────

    List<CommunityDtos.TrendingSkillDto> getTrendingSkills();

    List<CommunityDtos.SuggestedUserDto> getSuggestedUsers(String userId);

    long getOnlineCount();
}
