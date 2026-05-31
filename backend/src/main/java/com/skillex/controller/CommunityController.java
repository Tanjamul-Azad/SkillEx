package com.skillex.controller;

import com.skillex.config.JwtUtil;
import com.skillex.dto.common.ApiResponse;
import com.skillex.dto.common.PagedResponse;
import com.skillex.dto.community.*;
import com.skillex.service.CommunityService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * REST controller for all community features:
 * events, discussions, posts (with comments & likes), stories, and skill circles.
 */
@RestController
@RequestMapping("/api/community")
@RequiredArgsConstructor
public class CommunityController {

    private final CommunityService communityService;
    private final JwtUtil jwtUtil;

    // ── Helper ───────────────────────────────────────────────────────────────

    private String currentUserId(HttpServletRequest request) {
        String token = request.getHeader("Authorization");
        if (token != null && token.startsWith("Bearer ")) {
            return jwtUtil.extractUserId(token.substring(7));
        }
        return null;
    }

    // ── Events ──────────────────────────────────────────────────────────────

    @GetMapping("/events")
    public ResponseEntity<ApiResponse<PagedResponse<CommunityDtos.EventDto>>> getEvents(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        return ResponseEntity.ok(ApiResponse.ok(communityService.getEvents(page, size)));
    }

    @PostMapping("/events")
    public ResponseEntity<ApiResponse<CommunityDtos.EventDto>> createEvent(
        HttpServletRequest request,
        @RequestBody @Valid CreateEventRequest req
    ) {
        String userId = currentUserId(request);
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.created(communityService.createEvent(userId, req)));
    }

    @PostMapping("/events/{eventId}/attend")
    public ResponseEntity<ApiResponse<Void>> attendEvent(
        HttpServletRequest request,
        @PathVariable String eventId
    ) {
        String userId = currentUserId(request);
        communityService.attendEvent(userId, eventId);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    // ── Discussions ──────────────────────────────────────────────────────────

    @GetMapping("/discussions")
    public ResponseEntity<ApiResponse<PagedResponse<CommunityDtos.DiscussionDto>>> getDiscussions(
        HttpServletRequest request,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        String viewerId = currentUserId(request);
        return ResponseEntity.ok(ApiResponse.ok(communityService.getDiscussions(viewerId, page, size)));
    }

    @PostMapping("/discussions")
    public ResponseEntity<ApiResponse<CommunityDtos.DiscussionDto>> createDiscussion(
        HttpServletRequest request,
        @RequestBody @Valid CreateDiscussionRequest req
    ) {
        String userId = currentUserId(request);
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.created(communityService.createDiscussion(userId, req)));
    }

    @PostMapping("/discussions/{discussionId}/upvote")
    public ResponseEntity<ApiResponse<CommunityDtos.DiscussionDto>> upvoteDiscussion(
        HttpServletRequest request,
        @PathVariable String discussionId
    ) {
        String userId = currentUserId(request);
        return ResponseEntity.ok(ApiResponse.ok(communityService.upvoteDiscussion(userId, discussionId)));
    }

    // ── Posts ────────────────────────────────────────────────────────────────

    @GetMapping("/posts")
    public ResponseEntity<ApiResponse<PagedResponse<CommunityDtos.PostDto>>> getPosts(
        HttpServletRequest request,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        String viewerId = currentUserId(request);
        return ResponseEntity.ok(ApiResponse.ok(communityService.getPosts(viewerId, page, size)));
    }

    @GetMapping("/feed")
    public ResponseEntity<ApiResponse<PagedResponse<CommunityDtos.PostDto>>> getFeed(
        HttpServletRequest request,
        @RequestParam(defaultValue = "for-you") String mode,
        @RequestParam(required = false) String skillId,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        String viewerId = currentUserId(request);
        return ResponseEntity.ok(ApiResponse.ok(
            communityService.getFeed(viewerId, mode, skillId, page, size)));
    }

    @GetMapping("/posts/search")
    public ResponseEntity<ApiResponse<PagedResponse<CommunityDtos.PostDto>>> searchPosts(
        HttpServletRequest request,
        @RequestParam String intent,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        String viewerId = currentUserId(request);
        return ResponseEntity.ok(ApiResponse.ok(
            communityService.searchPostsByIntent(viewerId, intent, page, size)));
    }

    @GetMapping("/posts/user/{userId}")
    public ResponseEntity<ApiResponse<PagedResponse<CommunityDtos.PostDto>>> getUserPosts(
        @PathVariable String userId,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "10") int size
    ) {
        return ResponseEntity.ok(ApiResponse.ok(communityService.getUserPosts(userId, page, size)));
    }

    @PostMapping("/posts")
    public ResponseEntity<ApiResponse<CommunityDtos.PostDto>> createPost(
        HttpServletRequest request,
        @RequestBody @Valid CreatePostRequest req
    ) {
        String userId = currentUserId(request);
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.created(communityService.createPost(userId, req)));
    }

    @PostMapping("/posts/{postId}/like")
    public ResponseEntity<ApiResponse<CommunityDtos.PostDto>> likePost(
        HttpServletRequest request,
        @PathVariable String postId
    ) {
        String userId = currentUserId(request);
        return ResponseEntity.ok(ApiResponse.ok(communityService.likePost(userId, postId)));
    }

    @PostMapping("/posts/{postId}/unlike")
    public ResponseEntity<ApiResponse<CommunityDtos.PostDto>> unlikePost(
        HttpServletRequest request,
        @PathVariable String postId
    ) {
        String userId = currentUserId(request);
        return ResponseEntity.ok(ApiResponse.ok(communityService.unlikePost(userId, postId)));
    }

    @DeleteMapping("/posts/{postId}")
    public ResponseEntity<ApiResponse<Void>> deletePost(
        HttpServletRequest request,
        @PathVariable String postId
    ) {
        String userId = currentUserId(request);
        communityService.deletePost(userId, postId);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    // ── Comments ─────────────────────────────────────────────────────────────

    @GetMapping("/posts/{postId}/comments")
    public ResponseEntity<ApiResponse<PagedResponse<CommentDto>>> getComments(
        @PathVariable String postId,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        return ResponseEntity.ok(ApiResponse.ok(communityService.getComments(postId, page, size)));
    }

    @PostMapping("/posts/{postId}/comments")
    public ResponseEntity<ApiResponse<CommentDto>> addComment(
        HttpServletRequest request,
        @PathVariable String postId,
        @RequestBody @Valid CreateCommentRequest req
    ) {
        String userId = currentUserId(request);
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.created(communityService.addComment(userId, postId, req)));
    }

    // ── Stories ──────────────────────────────────────────────────────────────

    @GetMapping("/stories")
    public ResponseEntity<ApiResponse<List<CommunityDtos.StoryDto>>> getStories() {
        return ResponseEntity.ok(ApiResponse.ok(communityService.getStories()));
    }

    // ── Skill Circles ────────────────────────────────────────────────────────

    @GetMapping({"/skill-circles", "/circles"})
    public ResponseEntity<ApiResponse<PagedResponse<CommunityDtos.SkillCircleDto>>> getSkillCircles(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        return ResponseEntity.ok(ApiResponse.ok(communityService.getSkillCircles(page, size)));
    }

    @PostMapping({"/skill-circles", "/circles"})
    public ResponseEntity<ApiResponse<CommunityDtos.SkillCircleDto>> createSkillCircle(
        HttpServletRequest request,
        @RequestBody @Valid CreateSkillCircleRequest req
    ) {
        String userId = currentUserId(request);
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.created(communityService.createSkillCircle(userId, req)));
    }

    @PostMapping({"/skill-circles/{circleId}/join", "/circles/{circleId}/join"})
    public ResponseEntity<ApiResponse<CommunityDtos.SkillCircleDto>> joinSkillCircle(
        HttpServletRequest request,
        @PathVariable String circleId
    ) {
        String userId = currentUserId(request);
        return ResponseEntity.ok(ApiResponse.ok(communityService.joinSkillCircle(userId, circleId)));
    }

    @PostMapping({"/skill-circles/{circleId}/leave", "/circles/{circleId}/leave"})
    public ResponseEntity<ApiResponse<CommunityDtos.SkillCircleDto>> leaveSkillCircle(
        HttpServletRequest request,
        @PathVariable String circleId
    ) {
        String userId = currentUserId(request);
        return ResponseEntity.ok(ApiResponse.ok(communityService.leaveSkillCircle(userId, circleId)));
    }

    // ── Trending & Suggestions ───────────────────────────────────────────────

    @GetMapping("/trending-skills")
    public ResponseEntity<ApiResponse<List<CommunityDtos.TrendingSkillDto>>> getTrendingSkills() {
        return ResponseEntity.ok(ApiResponse.ok(communityService.getTrendingSkills()));
    }

    @GetMapping("/suggested-users")
    public ResponseEntity<ApiResponse<List<CommunityDtos.SuggestedUserDto>>> getSuggestedUsers(
        HttpServletRequest request
    ) {
        String userId = currentUserId(request);
        return ResponseEntity.ok(ApiResponse.ok(communityService.getSuggestedUsers(userId)));
    }

    @GetMapping("/online-count")
    public ResponseEntity<ApiResponse<Map<String, Long>>> getOnlineCount() {
        return ResponseEntity.ok(ApiResponse.ok(Map.of("count", communityService.getOnlineCount())));
    }
}
