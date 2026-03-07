package com.skillex.controller;

import com.skillex.dto.common.ApiResponse;
import com.skillex.dto.common.PagedResponse;
import com.skillex.dto.community.*;
import com.skillex.service.CommunityService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for community features.
 * Base path: /api/community
 */
@RestController
@RequestMapping("/api/community")
@RequiredArgsConstructor
public class CommunityController {

    private final CommunityService communityService;

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
        Authentication auth,
        @Valid @RequestBody CreateEventRequest req
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.ok(communityService.createEvent(userId(auth), req)));
    }

    @PostMapping("/events/{eventId}/attend")
    public ResponseEntity<ApiResponse<String>> attendEvent(
        Authentication auth,
        @PathVariable String eventId
    ) {
        communityService.attendEvent(userId(auth), eventId);
        return ResponseEntity.ok(ApiResponse.ok("Registered for event."));
    }

    // ── Discussions ──────────────────────────────────────────────────────────

    @GetMapping("/discussions")
    public ResponseEntity<ApiResponse<PagedResponse<CommunityDtos.DiscussionDto>>> getDiscussions(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        return ResponseEntity.ok(ApiResponse.ok(communityService.getDiscussions(page, size)));
    }

    @PostMapping("/discussions")
    public ResponseEntity<ApiResponse<CommunityDtos.DiscussionDto>> createDiscussion(
        Authentication auth,
        @Valid @RequestBody CreateDiscussionRequest req
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.ok(communityService.createDiscussion(userId(auth), req)));
    }

    @PostMapping("/discussions/{discussionId}/upvote")
    public ResponseEntity<ApiResponse<CommunityDtos.DiscussionDto>> upvote(
        Authentication auth,
        @PathVariable String discussionId
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            communityService.upvoteDiscussion(userId(auth), discussionId)));
    }

    // ── Posts ────────────────────────────────────────────────────────────────

    @GetMapping("/posts")
    public ResponseEntity<ApiResponse<PagedResponse<CommunityDtos.PostDto>>> getPosts(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        return ResponseEntity.ok(ApiResponse.ok(communityService.getPosts(page, size)));
    }

    @PostMapping("/posts")
    public ResponseEntity<ApiResponse<CommunityDtos.PostDto>> createPost(
        Authentication auth,
        @Valid @RequestBody CreatePostRequest req
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.ok(communityService.createPost(userId(auth), req)));
    }

    @PostMapping("/posts/{postId}/like")
    public ResponseEntity<ApiResponse<CommunityDtos.PostDto>> likePost(
        Authentication auth,
        @PathVariable String postId
    ) {
        return ResponseEntity.ok(ApiResponse.ok(communityService.likePost(userId(auth), postId)));
    }

    // ── Stories ──────────────────────────────────────────────────────────────

    @GetMapping("/stories")
    public ResponseEntity<ApiResponse<List<CommunityDtos.StoryDto>>> getStories() {
        return ResponseEntity.ok(ApiResponse.ok(communityService.getStories()));
    }

    // ── Skill Circles ────────────────────────────────────────────────────────

    @GetMapping("/skill-circles")
    public ResponseEntity<ApiResponse<PagedResponse<CommunityDtos.SkillCircleDto>>> getSkillCircles(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        return ResponseEntity.ok(ApiResponse.ok(communityService.getSkillCircles(page, size)));
    }

    @PostMapping("/skill-circles/{circleId}/join")
    public ResponseEntity<ApiResponse<CommunityDtos.SkillCircleDto>> joinCircle(
        Authentication auth,
        @PathVariable String circleId
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            communityService.joinSkillCircle(userId(auth), circleId)));
    }

    private String userId(Authentication auth) {
        return (String) auth.getPrincipal();
    }
}
