package com.skillex.service;

import com.skillex.dto.common.PagedResponse;
import com.skillex.dto.community.*;

import java.util.List;

/**
 * Contract for all community-related features in SkillEX:
 * events, discussions, posts, stories, and skill circles.
 */
public interface CommunityService {

    // ── Events ──────────────────────────────────────────────────────────────

    PagedResponse<CommunityDtos.EventDto> getEvents(String viewerId, int page, int size);

    CommunityDtos.EventDto getEvent(String viewerId, String eventId);

    CommunityDtos.EventDto createEvent(String organizerId, CreateEventRequest req);

    void attendEvent(String userId, String eventId);

    CommunityDtos.EventDto interestEvent(String userId, String eventId);

    // ── Discussions ──────────────────────────────────────────────────────────

    PagedResponse<CommunityDtos.DiscussionDto> getDiscussions(
        String viewerId,
        String category,
        String threadType,
        String status,
        String circleId,
        String skillId,
        int page,
        int size
    );

    CommunityDtos.DiscussionDto createDiscussion(String authorId, CreateDiscussionRequest req);

    CommunityDtos.DiscussionDto getDiscussion(String viewerId, String discussionId);

    CommunityDtos.DiscussionDto upvoteDiscussion(String userId, String discussionId);

    PagedResponse<CommunityDtos.DiscussionReplyDto> getDiscussionReplies(String discussionId, int page, int size);

    CommunityDtos.DiscussionReplyDto addDiscussionReply(String userId, String discussionId, CreateDiscussionReplyRequest req);

    CommunityDtos.DiscussionDto acceptDiscussionReply(String userId, String discussionId, String replyId);

    CommunityDtos.DiscussionDto resolveDiscussion(String userId, String discussionId);

    // ── Posts ────────────────────────────────────────────────────────────────

    PagedResponse<CommunityDtos.PostDto> getPosts(String viewerId, int page, int size);

    PagedResponse<CommunityDtos.PostDto> getFeed(String viewerId, String mode, String skillId, int page, int size);

    PagedResponse<CommunityDtos.PostDto> searchPostsByIntent(String viewerId, String intent, int page, int size);

    PagedResponse<CommunityDtos.PostDto> getUserPosts(String userId, int page, int size);

    CommunityDtos.PostDto createPost(String authorId, CreatePostRequest req);

    CommunityDtos.PostDto likePost(String userId, String postId);

    CommunityDtos.PostDto unlikePost(String userId, String postId);

    void deletePost(String userId, String postId);

    // ── Comments ─────────────────────────────────────────────────────────────

    PagedResponse<CommentDto> getComments(String postId, int page, int size);

    CommentDto addComment(String userId, String postId, CreateCommentRequest req);

    // ── Stories ──────────────────────────────────────────────────────────────

    List<CommunityDtos.StoryDto> getStories();

    // ── Skill Circles ────────────────────────────────────────────────────────

    PagedResponse<CommunityDtos.SkillCircleDto> getSkillCircles(String viewerId, int page, int size);

    CommunityDtos.SkillCircleDto getSkillCircle(String viewerId, String circleId);

    CommunityDtos.SkillCircleDto createSkillCircle(String creatorId, CreateSkillCircleRequest req);

    CommunityDtos.SkillCircleDto joinSkillCircle(String userId, String circleId);

    CommunityDtos.SkillCircleDto leaveSkillCircle(String userId, String circleId);

    PagedResponse<CommunityDtos.CircleResourceDto> getCircleResources(String circleId, int page, int size);

    CommunityDtos.CircleResourceDto createCircleResource(String userId, String circleId, CreateCircleResourceRequest req);

    CommunityDtos.SkillCircleDashboardDto getCircleDashboard(String viewerId, String circleId);

    // ── Trending & Suggestions ───────────────────────────────────────────────

    List<CommunityDtos.TrendingSkillDto> getTrendingSkills();

    List<CommunityDtos.SuggestedUserDto> getSuggestedUsers(String userId);

    long getOnlineCount();
}
