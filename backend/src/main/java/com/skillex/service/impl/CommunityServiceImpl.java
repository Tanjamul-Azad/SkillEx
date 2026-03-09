package com.skillex.service.impl;

import com.skillex.dto.common.PagedResponse;
import com.skillex.dto.community.*;
import com.skillex.model.*;
import com.skillex.repository.*;
import com.skillex.service.CommunityService;
import com.skillex.service.DtoMapper;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@SuppressWarnings("null")
public class CommunityServiceImpl implements CommunityService {

    private final EventRepository eventRepository;
    private final DiscussionRepository discussionRepository;
    private final PostRepository postRepository;
    private final StoryRepository storyRepository;
    private final SkillCircleRepository skillCircleRepository;
    private final UserRepository userRepository;
    private final SkillRepository skillRepository;
    private final DtoMapper mapper;

    // ── Events ──────────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<CommunityDtos.EventDto> getEvents(int page, int size) {
        var pageable = PageRequest.of(page, size, Sort.by("eventDate").ascending());
        return PagedResponse.of(eventRepository.findAll(pageable).map(mapper::toEvent));
    }

    @Override
    @Transactional
    public CommunityDtos.EventDto createEvent(String organizerId, CreateEventRequest req) {
        User organizer = findUser(organizerId);
        Event event = new Event();
        event.setId(UUID.randomUUID().toString());
        event.setHost(organizer);
        event.setTitle(req.title());
        event.setDescription(req.description());
        event.setEventDate(req.eventDate());
        event.setLocation(req.location());
        event.setIsOnline(req.isOnline());
        event.setCoverGradient(req.coverGradient());
        if (req.skillIds() != null) {
            List<Skill> skills = skillRepository.findAllById(req.skillIds());
            event.setSkills(skills);
        }
        return mapper.toEvent(eventRepository.save(event));
    }

    @Override
    @Transactional
    public void attendEvent(String userId, String eventId) {
        User user  = findUser(userId);
        Event event = eventRepository.findById(eventId)
            .orElseThrow(() -> new EntityNotFoundException("Event not found: " + eventId));
        if (!event.getAttendees().contains(user)) {
            event.getAttendees().add(user);
            eventRepository.save(event);
        }
    }

    // ── Discussions ──────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<CommunityDtos.DiscussionDto> getDiscussions(int page, int size) {
        var pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return PagedResponse.of(discussionRepository.findAll(pageable).map(mapper::toDiscussion));
    }

    @Override
    @Transactional
    public CommunityDtos.DiscussionDto createDiscussion(String authorId, CreateDiscussionRequest req) {
        User author = findUser(authorId);
        Discussion discussion = new Discussion();
        discussion.setId(UUID.randomUUID().toString());
        discussion.setAuthor(author);
        discussion.setTitle(req.title());
        discussion.setContent(req.content());
        discussion.setCategory(req.category());
        discussion.setUpvotes(0);
        discussion.setReplies(0);
        discussion.setViews(0);
        discussion.setIsPinned(false);
        return mapper.toDiscussion(discussionRepository.save(discussion));
    }

    @Override
    @Transactional
    public CommunityDtos.DiscussionDto upvoteDiscussion(String userId, String discussionId) {
        Discussion discussion = discussionRepository.findById(discussionId)
            .orElseThrow(() -> new EntityNotFoundException("Discussion not found: " + discussionId));
        discussion.setUpvotes(discussion.getUpvotes() + 1);
        return mapper.toDiscussion(discussionRepository.save(discussion));
    }

    // ── Posts ────────────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<CommunityDtos.PostDto> getPosts(int page, int size) {
        var pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return PagedResponse.of(postRepository.findAll(pageable).map(mapper::toPost));
    }

    @Override
    @Transactional
    public CommunityDtos.PostDto createPost(String authorId, CreatePostRequest req) {
        User author = findUser(authorId);
        Post post = new Post();
        post.setId(UUID.randomUUID().toString());
        post.setAuthor(author);
        post.setContent(req.content());
        post.setType(Post.PostType.valueOf(req.type().toUpperCase()));
        post.setLikes(0);
        post.setComments(0);
        post.setShares(0);
        return mapper.toPost(postRepository.save(post));
    }

    @Override
    @Transactional
    public CommunityDtos.PostDto likePost(String userId, String postId) {
        Post post = postRepository.findById(postId)
            .orElseThrow(() -> new EntityNotFoundException("Post not found: " + postId));
        post.setLikes(post.getLikes() + 1);
        return mapper.toPost(postRepository.save(post));
    }

    // ── Stories ──────────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public List<CommunityDtos.StoryDto> getStories() {
        return storyRepository.findAll(Sort.by("createdAt").descending())
            .stream().map(mapper::toStory).collect(Collectors.toList());
    }

    // ── Skill Circles ────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<CommunityDtos.SkillCircleDto> getSkillCircles(int page, int size) {
        var pageable = PageRequest.of(page, size, Sort.by("memberCount").descending());
        return PagedResponse.of(skillCircleRepository.findAll(pageable).map(mapper::toSkillCircle));
    }

    @Override
    @Transactional
    public CommunityDtos.SkillCircleDto joinSkillCircle(String userId, String circleId) {
        User user  = findUser(userId);
        SkillCircle circle = skillCircleRepository.findById(circleId)
            .orElseThrow(() -> new EntityNotFoundException("SkillCircle not found: " + circleId));
        if (!circle.getMembers().contains(user)) {
            circle.getMembers().add(user);
            circle.setMemberCount(circle.getMemberCount() + 1);
            skillCircleRepository.save(circle);
        }
        return mapper.toSkillCircle(circle);
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private User findUser(String id) {
        return userRepository.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("User not found: " + id));
    }
}
