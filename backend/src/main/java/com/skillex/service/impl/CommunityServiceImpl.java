package com.skillex.service.impl;

import com.skillex.dto.common.PagedResponse;
import com.skillex.dto.community.*;
import com.skillex.dto.skill.SkillSearchResultDto;
import com.skillex.model.*;
import com.skillex.repository.*;
import com.skillex.service.CommunityService;
import com.skillex.service.CommunityNotificationService;
import com.skillex.service.CreditService;
import com.skillex.service.DtoMapper;
import com.skillex.service.AccountRestrictionService;
import com.skillex.service.ProgressService;
import com.skillex.service.SkillService;
import com.skillex.service.reputation.ReputationUpdateEvent;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CommunityServiceImpl implements CommunityService {

    private final EventRepository eventRepository;
    private final DiscussionRepository discussionRepository;
    private final PostRepository postRepository;
    private final StoryRepository storyRepository;
    private final SkillCircleRepository skillCircleRepository;
    private final UserRepository userRepository;
    private final SkillRepository skillRepository;
    private final EventRsvpRepository eventRsvpRepository;
    private final PostLikeRepository postLikeRepository;
    private final DiscussionUpvoteRepository discussionUpvoteRepository;
    private final DiscussionReplyRepository discussionReplyRepository;
    private final CommentRepository commentRepository;
    private final SkillCircleResourceRepository skillCircleResourceRepository;
    private final ConnectionRepository connectionRepository;
    private final UserSkillOfferedRepository offeredRepo;
    private final SkillService skillService;
    private final DtoMapper mapper;
    private final ApplicationEventPublisher eventPublisher;
    private final AccountRestrictionService restrictionService;
    private final CreditService creditService;
    private final CommunityNotificationService communityNotificationService;
    private final ProgressService progressService;

    // Events

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<CommunityDtos.EventDto> getEvents(String viewerId, int page, int size) {
        var pageable = PageRequest.of(page, size, Sort.by("eventDate").ascending());
        Page<Event> eventPage = eventRepository.findAll(pageable);
        List<CommunityDtos.EventDto> content = eventPage.getContent().stream()
            .map(event -> mapEvent(event, viewerId))
            .toList();
        return new PagedResponse<>(
            content,
            eventPage.getNumber(),
            eventPage.getSize(),
            eventPage.getTotalElements(),
            eventPage.getTotalPages(),
            eventPage.isLast()
        );
    }

    @Override
    @Transactional(readOnly = true)
    public CommunityDtos.EventDto getEvent(String viewerId, String eventId) {
        Event event = eventRepository.findById(eventId)
            .orElseThrow(() -> new EntityNotFoundException("Event not found: " + eventId));
        return mapEvent(event, viewerId);
    }

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<CommunityDtos.EventDto> getUserEvents(String userId, String relation, int page, int size) {
        if (!userRepository.existsById(userId)) {
            throw new EntityNotFoundException("User not found: " + userId);
        }
        var pageable = PageRequest.of(page, size, Sort.by("eventDate").descending());
        var unsortedPageable = PageRequest.of(page, size);
        String normalizedRelation = relation == null ? "rsvp" : relation.toLowerCase(Locale.ROOT);
        Page<Event> eventPage = switch (normalizedRelation) {
            case "hosted" -> eventRepository.findByHostId(userId, pageable);
            case "going" -> eventRsvpRepository.findEventsByUserAndStates(
                userId,
                List.of(EventRsvp.RsvpState.GOING),
                unsortedPageable
            );
            case "interested" -> eventRsvpRepository.findEventsByUserAndStates(
                userId,
                List.of(EventRsvp.RsvpState.INTERESTED),
                unsortedPageable
            );
            default -> eventRsvpRepository.findEventsByUserAndStates(
                userId,
                List.of(EventRsvp.RsvpState.GOING, EventRsvp.RsvpState.INTERESTED),
                unsortedPageable
            );
        };
        List<CommunityDtos.EventDto> content = eventPage.getContent().stream()
            .map(event -> mapEvent(event, userId))
            .toList();
        return new PagedResponse<>(
            content,
            eventPage.getNumber(),
            eventPage.getSize(),
            eventPage.getTotalElements(),
            eventPage.getTotalPages(),
            eventPage.isLast()
        );
    }

    @Override
    @Transactional
    public CommunityDtos.EventDto createEvent(String organizerId, CreateEventRequest req) {
        restrictionService.assertCanUseAccount(organizerId, "COMMUNITY");
        User organizer = findUser(organizerId);
        Event event = new Event();
        event.setHost(organizer);
        event.setTitle(req.title());
        event.setDescription(req.description());
        event.setEventDate(req.eventDate());
        event.setLocation(req.location());
        event.setIsOnline(req.isOnline());
        event.setCoverGradient(req.coverGradient());
        event.setMeetingUrl(req.meetingUrl());
        event.setEventType(parseEnum(req.eventType(), Event.EventType.WORKSHOP, Event.EventType.class));
        event.setStatus(Event.EventStatus.SCHEDULED);
        if (req.circleId() != null && !req.circleId().isBlank()) {
            SkillCircle circle = skillCircleRepository.findById(req.circleId())
                .orElseThrow(() -> new EntityNotFoundException("SkillCircle not found: " + req.circleId()));
            assertCircleMember(circle, organizerId, "Join this skill circle before creating circle events.");
            event.setCircle(circle);
        }
        if (req.skillIds() != null) {
            List<Skill> skills = skillRepository.findAllById(req.skillIds());
            event.setSkills(skills);
        }
        Event saved = eventRepository.save(event);
        communityNotificationService.notifyEventCreated(saved);
        progressService.awardXp(organizerId, "EVENT_CREATED", saved.getId(), 15, "Hosted a community event: " + saved.getTitle() + ".");
        return mapEvent(saved, organizerId);
    }

    @Override
    @Transactional
    public CommunityDtos.EventDto attendEvent(String userId, String eventId) {
        User user  = findUser(userId);
        Event event = eventRepository.findById(eventId)
            .orElseThrow(() -> new EntityNotFoundException("Event not found: " + eventId));
        if (event.getCircle() != null) {
            assertCircleMember(event.getCircle(), userId, "Join this skill circle before registering for its events.");
        }
        EventRsvp.RsvpState previousState = currentRsvpState(event, userId);
        if (previousState == EventRsvp.RsvpState.GOING) {
            // Toggle off: cancel the registration
            event.getAttendees().removeIf(attendee -> userId.equals(attendee.getId()));
            eventRepository.save(event);
            upsertRsvp(event, user, EventRsvp.RsvpState.NOT_GOING);
            return mapEvent(event, userId);
        }
        assertEventNotPast(event);
        boolean alreadyAttending = event.getAttendees().stream()
            .anyMatch(attendee -> userId.equals(attendee.getId()));
        if (!alreadyAttending) {
            event.getAttendees().add(user);
            eventRepository.save(event);
        }
        upsertRsvp(event, user, EventRsvp.RsvpState.GOING);
        communityNotificationService.notifyEventRsvp(event, user, EventRsvp.RsvpState.GOING);
        progressService.awardXp(userId, "EVENT_GOING", eventId, 5, "Registered for " + event.getTitle() + ".");
        return mapEvent(event, userId);
    }

    @Override
    @Transactional
    public CommunityDtos.EventDto interestEvent(String userId, String eventId) {
        User user = findUser(userId);
        Event event = eventRepository.findById(eventId)
            .orElseThrow(() -> new EntityNotFoundException("Event not found: " + eventId));
        if (event.getCircle() != null) {
            assertCircleMember(event.getCircle(), userId, "Join this skill circle before following its events.");
        }
        EventRsvp.RsvpState previousState = currentRsvpState(event, userId);
        if (previousState == EventRsvp.RsvpState.GOING) {
            return mapEvent(event, userId);
        }
        if (previousState == EventRsvp.RsvpState.INTERESTED) {
            // Toggle off: stop following this event
            upsertRsvp(event, user, EventRsvp.RsvpState.NOT_GOING);
            return mapEvent(event, userId);
        }
        assertEventNotPast(event);
        upsertRsvp(event, user, EventRsvp.RsvpState.INTERESTED);
        communityNotificationService.notifyEventRsvp(event, user, EventRsvp.RsvpState.INTERESTED);
        progressService.awardXp(userId, "EVENT_INTERESTED", eventId, 2, "Followed updates for " + event.getTitle() + ".");
        return mapEvent(event, userId);
    }

    // Discussions

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<CommunityDtos.DiscussionDto> getDiscussions(
        String viewerId,
        String category,
        String threadType,
        String status,
        String circleId,
        String skillId,
        String eventId,
        int page,
        int size
    ) {
        var pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        String normalizedCategory = category == null || category.isBlank() || "All".equalsIgnoreCase(category)
            ? null
            : category;
        Discussion.ThreadType parsedThreadType = parseEnum(threadType, null, Discussion.ThreadType.class);
        Discussion.DiscussionStatus parsedStatus = parseEnum(status, null, Discussion.DiscussionStatus.class);
        if (circleId != null && !circleId.isBlank()) {
            SkillCircle circle = skillCircleRepository.findById(circleId)
                .orElseThrow(() -> new EntityNotFoundException("SkillCircle not found: " + circleId));
            assertCircleMember(circle, viewerId, "Join this skill circle before opening its help desk.");
        }
        Page<Discussion> discussionPage = discussionRepository.searchCommunityThreads(
            normalizedCategory,
            parsedThreadType,
            parsedStatus,
            blankToNull(circleId),
            blankToNull(skillId),
            blankToNull(eventId),
            pageable
        );
        List<Discussion> discussions = discussionPage.getContent();
        Set<String> upvotedIds = Set.of();
        if (viewerId != null && !viewerId.isBlank() && !discussions.isEmpty()) {
            upvotedIds = new HashSet<>(discussionUpvoteRepository.findUpvotedDiscussionIdsByUser(
                viewerId,
                discussions.stream().map(Discussion::getId).toList()
            ));
        }
        final Set<String> upvotedDiscussionIds = upvotedIds;

        List<CommunityDtos.DiscussionDto> content = discussions.stream()
            .map(discussion -> mapper.toDiscussion(discussion, upvotedDiscussionIds.contains(discussion.getId())))
            .toList();

        return new PagedResponse<>(
            content,
            discussionPage.getNumber(),
            discussionPage.getSize(),
            discussionPage.getTotalElements(),
            discussionPage.getTotalPages(),
            discussionPage.isLast()
        );
    }

    @Override
    @Transactional
    public CommunityDtos.DiscussionDto createDiscussion(String authorId, CreateDiscussionRequest req) {
        restrictionService.assertCanUseAccount(authorId, "POSTING");
        User author = findUser(authorId);
        Discussion discussion = new Discussion();
        discussion.setAuthor(author);
        discussion.setTitle(req.title());
        discussion.setContent(req.content());
        discussion.setCategory(req.category() == null || req.category().isBlank() ? "General" : req.category());
        discussion.setThreadType(parseEnum(req.threadType(), Discussion.ThreadType.QUESTION, Discussion.ThreadType.class));
        discussion.setStatus(Discussion.DiscussionStatus.OPEN);
        if (req.skillId() != null && !req.skillId().isBlank()) {
            discussion.setSkill(skillRepository.findById(req.skillId()).orElse(null));
        }
        if (req.circleId() != null && !req.circleId().isBlank()) {
            SkillCircle circle = skillCircleRepository.findById(req.circleId())
                .orElseThrow(() -> new EntityNotFoundException("SkillCircle not found: " + req.circleId()));
            assertCircleMember(circle, authorId, "Join this skill circle before posting in it.");
            discussion.setCircle(circle);
        }
        if (req.eventId() != null && !req.eventId().isBlank()) {
            // Event discussion walls are open to any signed-in member (events are public),
            // so no membership gate here — just link the thread to the event.
            Event event = eventRepository.findById(req.eventId())
                .orElseThrow(() -> new EntityNotFoundException("Event not found: " + req.eventId()));
            discussion.setEvent(event);
        }
        discussion.setUpvotes(0);
        discussion.setReplies(0);
        discussion.setViews(0);
        discussion.setIsPinned(false);
        discussion.setCoverImageUrl(req.coverImageUrl() == null ? null : req.coverImageUrl().trim());
        Discussion saved = discussionRepository.save(discussion);
        CommunityDtos.DiscussionDto result = mapper.toDiscussion(saved);

        if (saved.getCircle() != null) {
            communityNotificationService.notifyCircleDiscussionCreated(saved);
        }

        eventPublisher.publishEvent(new ReputationUpdateEvent(
            authorId, ReputationUpdateEvent.Trigger.COMMUNITY_INTERACTION));
        progressService.awardXp(authorId, "DISCUSSION_CREATED", saved.getId(), 8, "Started a community discussion.");

        return result;
    }

    @Override
    @Transactional
    public CommunityDtos.DiscussionDto getDiscussion(String viewerId, String discussionId) {
        Discussion discussion = discussionRepository.findById(discussionId)
            .orElseThrow(() -> new EntityNotFoundException("Discussion not found: " + discussionId));
        assertDiscussionAccess(discussion, viewerId);
        boolean upvoted = viewerId != null
            && !viewerId.isBlank()
            && discussionUpvoteRepository.existsByIdDiscussionIdAndIdUserId(discussionId, viewerId);
        discussion.setViews(discussion.getViews() + 1);
        return mapper.toDiscussion(discussion, upvoted);
    }

    @Override
    @Transactional
    public CommunityDtos.DiscussionDto upvoteDiscussion(String userId, String discussionId) {
        restrictionService.assertCanUseAccount(userId, "COMMUNITY");
        Discussion discussion = discussionRepository.findById(discussionId)
            .orElseThrow(() -> new EntityNotFoundException("Discussion not found: " + discussionId));
        assertDiscussionAccess(discussion, userId);
        User user = findUser(userId);
        boolean alreadyUpvoted = discussionUpvoteRepository.existsByIdDiscussionIdAndIdUserId(discussionId, userId);

        if (alreadyUpvoted) {
            discussionUpvoteRepository.deleteById(new DiscussionUpvote.DiscussionUpvoteId(discussionId, userId));
            discussion.setUpvotes(Math.max(0, discussion.getUpvotes() - 1));
            return mapper.toDiscussion(discussionRepository.save(discussion), false);
        }

        DiscussionUpvote upvote = DiscussionUpvote.builder()
            .id(new DiscussionUpvote.DiscussionUpvoteId(discussionId, userId))
            .discussion(discussion)
            .user(user)
            .build();
        discussionUpvoteRepository.save(upvote);
        discussion.setUpvotes(discussion.getUpvotes() + 1);
        return mapper.toDiscussion(discussionRepository.save(discussion), true);
    }

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<CommunityDtos.DiscussionReplyDto> getDiscussionReplies(String viewerId, String discussionId, int page, int size) {
        Discussion discussion = discussionRepository.findById(discussionId)
            .orElseThrow(() -> new EntityNotFoundException("Discussion not found: " + discussionId));
        assertDiscussionAccess(discussion, viewerId);
        return PagedResponse.of(discussionReplyRepository
            .findByDiscussionIdOrderByCreatedAtAsc(discussionId, PageRequest.of(page, size))
            .map(mapper::toDiscussionReply));
    }

    @Override
    @Transactional
    public CommunityDtos.DiscussionReplyDto addDiscussionReply(String userId, String discussionId, CreateDiscussionReplyRequest req) {
        restrictionService.assertCanUseAccount(userId, "COMMENTING");
        Discussion discussion = discussionRepository.findById(discussionId)
            .orElseThrow(() -> new EntityNotFoundException("Discussion not found: " + discussionId));
        assertDiscussionAccess(discussion, userId);
        User author = findUser(userId);
        DiscussionReply reply = DiscussionReply.builder()
            .discussion(discussion)
            .author(author)
            .content(req.content())
            .isAccepted(false)
            .build();
        DiscussionReply saved = discussionReplyRepository.saveAndFlush(reply);
        discussion.setReplies(discussion.getReplies() + 1);
        discussionRepository.save(discussion);
        communityNotificationService.notifyDiscussionReply(discussion, saved);

        eventPublisher.publishEvent(new ReputationUpdateEvent(
            userId, ReputationUpdateEvent.Trigger.COMMUNITY_INTERACTION));
        progressService.awardXp(userId, "DISCUSSION_REPLY", saved.getId(), 5, "Helped in a community discussion.");

        return mapper.toDiscussionReply(saved);
    }

    @Override
    @Transactional
    public CommunityDtos.DiscussionDto acceptDiscussionReply(String userId, String discussionId, String replyId) {
        Discussion discussion = discussionRepository.findById(discussionId)
            .orElseThrow(() -> new EntityNotFoundException("Discussion not found: " + discussionId));
        assertDiscussionAccess(discussion, userId);
        if (!discussion.getAuthor().getId().equals(userId)) {
            throw new IllegalArgumentException("Only the discussion author can accept an answer.");
        }
        DiscussionReply reply = discussionReplyRepository.findById(replyId)
            .orElseThrow(() -> new EntityNotFoundException("Discussion reply not found: " + replyId));
        if (!reply.getDiscussion().getId().equals(discussionId)) {
            throw new IllegalArgumentException("This reply does not belong to the discussion.");
        }
        discussionReplyRepository.clearAcceptedForDiscussion(discussionId);
        reply.setIsAccepted(true);
        discussionReplyRepository.save(reply);
        discussion.setAcceptedReply(reply);
        discussion.setStatus(Discussion.DiscussionStatus.SOLVED);
        Discussion saved = discussionRepository.save(discussion);
        communityNotificationService.notifyAnswerAccepted(saved, reply, userId);
        return mapper.toDiscussion(saved, discussionUpvoteRepository.existsByIdDiscussionIdAndIdUserId(discussionId, userId));
    }

    @Override
    @Transactional
    public CommunityDtos.DiscussionDto resolveDiscussion(String userId, String discussionId) {
        Discussion discussion = discussionRepository.findById(discussionId)
            .orElseThrow(() -> new EntityNotFoundException("Discussion not found: " + discussionId));
        assertDiscussionAccess(discussion, userId);
        if (!discussion.getAuthor().getId().equals(userId)) {
            throw new IllegalArgumentException("Only the discussion author can resolve this discussion.");
        }
        discussion.setStatus(Discussion.DiscussionStatus.SOLVED);
        return mapper.toDiscussion(discussionRepository.save(discussion),
            discussionUpvoteRepository.existsByIdDiscussionIdAndIdUserId(discussionId, userId));
    }

    // Posts

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<CommunityDtos.PostDto> getPosts(String viewerId, int page, int size) {
        var pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<Post> postPage = postRepository.findAll(pageable);
        return mapPostsWithLikeState(postPage, viewerId);
    }

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<CommunityDtos.PostDto> getFeed(String viewerId, String mode, String skillId, int page, int size) {
        String normalizedMode = mode == null || mode.isBlank() ? "for-you" : mode.toLowerCase(Locale.ROOT);
        if (viewerId == null || viewerId.isBlank()) {
            return getPosts(null, page, size);
        }

        if ("skill".equals(normalizedMode) && skillId != null && !skillId.isBlank()) {
            Skill skill = skillRepository.findById(skillId).orElse(null);
            String reason = skill == null ? "Dedicated skill feed" : "Dedicated " + skill.getName() + " feed";
            return mapPostsWithReason(postRepository.findBySkillIdOrderByCreatedAtDesc(
                skillId, PageRequest.of(page, size)), viewerId, reason, 90);
        }

        User viewer = findUser(viewerId);
        Set<String> wantedSkillIds = viewer.getSkillsWanted().stream().map(Skill::getId).collect(Collectors.toSet());
        Set<String> offeredSkillIds = viewer.getSkillsOffered().stream().map(Skill::getId).collect(Collectors.toSet());
        Set<String> connectedUserIds = new HashSet<>(connectionRepository.findConnectedUserIds(
            viewerId, Connection.ConnectionStatus.ACCEPTED));

        List<Post> source = postRepository.findTop200ByOrderByCreatedAtDesc().stream()
            .filter(post -> !post.getAuthor().getId().equals(viewerId))
            .toList();

        List<ScoredPost> scored = switch (normalizedMode) {
            case "following" -> source.stream()
                .filter(post -> connectedUserIds.contains(post.getAuthor().getId()))
                .map(post -> new ScoredPost(post, baseEngagementScore(post) + 80, "From someone you are connected with"))
                .toList();
            case "trending" -> source.stream()
                .map(post -> new ScoredPost(post, baseEngagementScore(post) + post.getLikes() * 3 + post.getComments() * 5,
                    post.getSkill() == null ? "Trending in the community" : "Trending around " + post.getSkill().getName()))
                .sorted(scoredPostComparator())
                .toList();
            case "random" -> {
                List<Post> shuffled = new ArrayList<>(source);
                Collections.shuffle(shuffled, new Random(Objects.hash(viewerId, page, LocalDateTime.now().getDayOfYear())));
                yield shuffled.stream()
                    .map(post -> new ScoredPost(post, 20, "Random discovery outside your usual feed"))
                    .toList();
            }
            default -> source.stream()
                .map(post -> scoreForYou(post, wantedSkillIds, offeredSkillIds, connectedUserIds))
                .sorted(scoredPostComparator())
                .toList();
        };

        return toPagedPosts(scored, viewerId, page, size);
    }

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<CommunityDtos.PostDto> searchPostsByIntent(String viewerId, String intent, int page, int size) {
        var pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());

        if (intent == null || intent.isBlank()) {
            return getPosts(viewerId, page, size);
        }

        List<String> skillIds = skillService.searchByIntent(intent).stream()
            .map(SkillSearchResultDto::skillId)
            .limit(8)
            .collect(Collectors.toList());

        Page<Post> pageResult = skillIds.isEmpty()
            ? postRepository.findByContentContainingIgnoreCaseOrderByCreatedAtDesc(intent, pageable)
            : postRepository.findBySkill_IdInOrContentContainingIgnoreCaseOrderByCreatedAtDesc(skillIds, intent, pageable);

        return mapPostsWithLikeState(pageResult, viewerId);
    }

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<CommunityDtos.PostDto> getUserPosts(String userId, int page, int size) {
        var pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<Post> postPage = postRepository.findByAuthorId(userId, pageable);
        return mapPostsWithLikeState(postPage, null);
    }

    @Override
    @Transactional
    public CommunityDtos.PostDto createPost(String authorId, CreatePostRequest req) {
        restrictionService.assertCanUseAccount(authorId, "POSTING");
        User author = findUser(authorId);
        Post post = new Post();
        post.setAuthor(author);
        post.setContent(req.content());
        post.setType(Post.PostType.valueOf(req.type().toUpperCase()));
        post.setMediaUrl(req.mediaUrl());
        post.setBadge(req.badge());
        post.setLikes(0);
        post.setComments(0);
        post.setShares(0);

        // Link skill to the post if provided
        if (req.skillId() != null && !req.skillId().isBlank()) {
            Skill skill = skillRepository.findById(req.skillId()).orElse(null);
            post.setSkill(skill);
        }

        CommunityDtos.PostDto result = mapper.toPost(postRepository.saveAndFlush(post), false);

        eventPublisher.publishEvent(new ReputationUpdateEvent(
            authorId, ReputationUpdateEvent.Trigger.COMMUNITY_INTERACTION));
        progressService.awardXp(authorId, "COMMUNITY_POST", result.id(), 10, "Shared a community post.");

        return result;
    }

    @Override
    @Transactional
    public CommunityDtos.PostDto likePost(String userId, String postId) {
        restrictionService.assertCanUseAccount(userId, "COMMUNITY");
        Post post = postRepository.findById(postId)
            .orElseThrow(() -> new EntityNotFoundException("Post not found: " + postId));
        User user = findUser(userId);

        boolean alreadyLiked = postLikeRepository.existsByIdPostIdAndIdUserId(postId, userId);

        if (alreadyLiked) {
            return mapper.toPost(post, true);
        }

        PostLike like = PostLike.builder()
            .id(new PostLike.PostLikeId(postId, userId))
            .post(post)
            .user(user)
            .build();
        postLikeRepository.save(like);
        post.setLikes(post.getLikes() + 1);
        postRepository.save(post);
        rewardCommunityContributionIfEligible(post);
        return mapper.toPost(post, true);
    }

    @Override
    @Transactional
    public CommunityDtos.PostDto unlikePost(String userId, String postId) {
        restrictionService.assertCanUseAccount(userId, "COMMUNITY");
        Post post = postRepository.findById(postId)
            .orElseThrow(() -> new EntityNotFoundException("Post not found: " + postId));

        if (postLikeRepository.existsByIdPostIdAndIdUserId(postId, userId)) {
            postLikeRepository.deleteById(new PostLike.PostLikeId(postId, userId));
            post.setLikes(Math.max(0, post.getLikes() - 1));
            postRepository.save(post);
        }

        return mapper.toPost(post, false);
    }

    private void rewardCommunityContributionIfEligible(Post post) {
        if (Boolean.TRUE.equals(post.getCreditRewarded())) return;
        if (post.getSkill() == null) return;
        if (post.getLikes() < 10) return;
        post.setCreditRewarded(true);
        postRepository.save(post);
        creditService.rewardCommunityContribution(
            post.getAuthor().getId(),
            5,
            "Earned credits because a skill-tagged community contribution reached 10 upvotes."
        );
        progressService.awardXp(
            post.getAuthor().getId(),
            "COMMUNITY_POST_UPVOTED",
            post.getId(),
            15,
            "Community contribution reached 10 upvotes."
        );
    }

    @Override
    @Transactional
    public void deletePost(String userId, String postId) {
        Post post = postRepository.findById(postId)
            .orElseThrow(() -> new EntityNotFoundException("Post not found: " + postId));
        if (!post.getAuthor().getId().equals(userId)) {
            throw new IllegalArgumentException("You can only delete your own posts.");
        }
        // Clean up related data
        commentRepository.deleteAllByPostId(postId);
        postLikeRepository.deleteAllByPostId(postId);
        postRepository.delete(post);
    }

    // Comments

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<CommentDto> getComments(String postId, int page, int size) {
        if (!postRepository.existsById(postId)) {
            throw new EntityNotFoundException("Post not found: " + postId);
        }
        var pageable = PageRequest.of(page, size);
        Page<CommentDto> commentPage = commentRepository
            .findByPostIdOrderByCreatedAtAsc(postId, pageable)
            .map(mapper::toComment);
        return PagedResponse.of(commentPage);
    }

    @Override
    @Transactional
    public CommentDto addComment(String userId, String postId, CreateCommentRequest req) {
        restrictionService.assertCanUseAccount(userId, "COMMENTING");
        Post post = postRepository.findById(postId)
            .orElseThrow(() -> new EntityNotFoundException("Post not found: " + postId));
        User author = findUser(userId);

        Comment comment = Comment.builder()
            .post(post)
            .author(author)
            .content(req.content())
            .build();
        Comment saved = commentRepository.saveAndFlush(comment);

        // Update the post's comment counter
        post.setComments(post.getComments() + 1);
        postRepository.save(post);

        eventPublisher.publishEvent(new ReputationUpdateEvent(
            userId, ReputationUpdateEvent.Trigger.COMMUNITY_INTERACTION));
        progressService.awardXp(userId, "COMMUNITY_COMMENT", saved.getId(), 3, "Commented on a community post.");

        return mapper.toComment(saved);
    }

    // Stories


    @Override
    @Transactional(readOnly = true)
    public List<CommunityDtos.StoryDto> getStories() {
        return storyRepository.findAll(Sort.by("createdAt").descending())
            .stream().map(mapper::toStory).collect(Collectors.toList());
    }

    // Skill Circles

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<CommunityDtos.SkillCircleDto> getSkillCircles(String viewerId, int page, int size) {
        var pageable = PageRequest.of(page, size, Sort.by("memberCount").descending());
        Page<SkillCircle> circlePage = skillCircleRepository.findAll(pageable);
        List<CommunityDtos.SkillCircleDto> content = circlePage.getContent().stream()
            .map(circle -> mapSkillCircle(circle, viewerId))
            .toList();
        return new PagedResponse<>(
            content,
            circlePage.getNumber(),
            circlePage.getSize(),
            circlePage.getTotalElements(),
            circlePage.getTotalPages(),
            circlePage.isLast()
        );
    }

    @Override
    @Transactional(readOnly = true)
    public CommunityDtos.SkillCircleDto getSkillCircle(String viewerId, String circleId) {
        SkillCircle circle = skillCircleRepository.findById(circleId)
            .orElseThrow(() -> new EntityNotFoundException("SkillCircle not found: " + circleId));
        return mapSkillCircle(circle, viewerId);
    }

    @Override
    @Transactional
    public CommunityDtos.SkillCircleDto createSkillCircle(String creatorId, CreateSkillCircleRequest req) {
        restrictionService.assertCanUseAccount(creatorId, "COMMUNITY");
        User creator = findUser(creatorId);
        SkillCircle circle = new SkillCircle();
        circle.setName(req.name());
        circle.setDescription(req.description());
        circle.setOwner(creator);
        if (req.icon() != null && !req.icon().isBlank()) {
            circle.setIcon(req.icon());
        }
        circle.setActivity(SkillCircle.ActivityLevel.ACTIVE);
        circle.getMembers().add(creator);
        circle.setMemberCount(1);

        if (req.skillIds() != null && !req.skillIds().isEmpty()) {
            List<Skill> skills = skillRepository.findAllById(req.skillIds());
            circle.setSkills(skills);
        }
        circle.setCoverImageUrl(req.coverImageUrl() == null ? null : req.coverImageUrl().trim());

        SkillCircle saved = skillCircleRepository.save(circle);
        return mapSkillCircle(saved, creatorId);
    }

    @Override
    @Transactional
    public CommunityDtos.SkillCircleDto joinSkillCircle(String userId, String circleId) {
        User user  = findUser(userId);
        SkillCircle circle = skillCircleRepository.findById(circleId)
            .orElseThrow(() -> new EntityNotFoundException("SkillCircle not found: " + circleId));
        boolean alreadyMember = circle.getMembers().stream()
            .anyMatch(member -> member.getId().equals(userId));
        if (!alreadyMember) {
            circle.getMembers().add(user);
            circle.setMemberCount(circle.getMemberCount() + 1);
            skillCircleRepository.save(circle);
        }
        return mapSkillCircle(circle, userId);
    }

    @Override
    @Transactional
    public CommunityDtos.SkillCircleDto leaveSkillCircle(String userId, String circleId) {
        SkillCircle circle = skillCircleRepository.findById(circleId)
            .orElseThrow(() -> new EntityNotFoundException("SkillCircle not found: " + circleId));

        int removed = skillCircleRepository.deleteMember(circleId, userId);
        if (removed > 0) {
            circle.getMembers().removeIf(member -> userId.equals(member.getId()));
            circle.setMemberCount(Math.max(0, circle.getMemberCount() - 1));
            skillCircleRepository.save(circle);
        }

        return mapSkillCircle(circle, userId);
    }

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<CommunityDtos.CircleResourceDto> getCircleResources(String circleId, int page, int size) {
        if (!skillCircleRepository.existsById(circleId)) {
            throw new EntityNotFoundException("SkillCircle not found: " + circleId);
        }
        return PagedResponse.of(skillCircleResourceRepository
            .findByCircleIdOrderByIsPinnedDescCreatedAtDesc(circleId, PageRequest.of(page, size))
            .map(mapper::toCircleResource));
    }

    @Override
    @Transactional
    public CommunityDtos.CircleResourceDto createCircleResource(String userId, String circleId, CreateCircleResourceRequest req) {
        restrictionService.assertCanUseAccount(userId, "COMMUNITY");
        User author = findUser(userId);
        SkillCircle circle = skillCircleRepository.findById(circleId)
            .orElseThrow(() -> new EntityNotFoundException("SkillCircle not found: " + circleId));
        if (circle.getMembers().stream().noneMatch(member -> member.getId().equals(userId))) {
            throw new IllegalArgumentException("Join this skill circle before adding resources.");
        }

        SkillCircleResource resource = new SkillCircleResource();
        resource.setCircle(circle);
        resource.setAuthor(author);
        resource.setTitle(req.title());
        resource.setUrl(req.url());
        resource.setNotes(req.notes());
        resource.setResourceType(parseEnum(req.resourceType(), SkillCircleResource.ResourceType.LINK, SkillCircleResource.ResourceType.class));
        resource.setDifficulty(parseEnum(req.difficulty(), SkillCircleResource.Difficulty.BEGINNER, SkillCircleResource.Difficulty.class));
        resource.setUpvotes(0);
        resource.setIsPinned(false);
        resource.setIsVerified(false);
        if (req.skillId() != null && !req.skillId().isBlank()) {
            resource.setSkill(skillRepository.findById(req.skillId()).orElse(null));
        }

        SkillCircleResource saved = skillCircleResourceRepository.save(resource);
        communityNotificationService.notifyCircleActivity(
            circle,
            userId,
            author.getName() + " shared a resource in " + circle.getName() + ": " + saved.getTitle()
        );
        return mapper.toCircleResource(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public CommunityDtos.SkillCircleDashboardDto getCircleDashboard(String viewerId, String circleId) {
        SkillCircle circle = skillCircleRepository.findById(circleId)
            .orElseThrow(() -> new EntityNotFoundException("SkillCircle not found: " + circleId));
        CommunityDtos.SkillCircleDto circleDto = mapSkillCircle(circle, viewerId);
        CommunityDtos.EventDto nextEvent = eventRepository
            .findByCircleIdAndEventDateAfterOrderByEventDateAsc(circleId, LocalDateTime.now(), PageRequest.of(0, 1))
            .stream()
            .findFirst()
            .map(event -> mapEvent(event, viewerId))
            .orElse(null);
        List<CommunityDtos.CircleResourceDto> topResources = skillCircleResourceRepository
            .findTop5ByCircleIdOrderByIsPinnedDescUpvotesDescCreatedAtDesc(circleId)
            .stream()
            .map(mapper::toCircleResource)
            .toList();
        List<CommunityDtos.DiscussionDto> openHelpRequests = discussionRepository.searchCommunityThreads(
                null,
                Discussion.ThreadType.QUESTION,
                Discussion.DiscussionStatus.OPEN,
                circleId,
                null,
                null,
                PageRequest.of(0, 5, Sort.by("createdAt").descending())
            )
            .getContent()
            .stream()
            .map(mapper::toDiscussion)
            .toList();
        long solvedQuestions = discussionRepository.countByCircleIdAndStatus(circleId, Discussion.DiscussionStatus.SOLVED);
        int activityScore = (int) Math.min(100,
            circleDto.resourceCount() * 8 + circleDto.openHelpCount() * 6 + solvedQuestions * 10 + circleDto.upcomingEventCount() * 12
        );
        String weeklyGoal = "Share 2 resources, solve 1 help request, and run 1 practice session.";
        return new CommunityDtos.SkillCircleDashboardDto(
            circleDto,
            nextEvent,
            topResources,
            openHelpRequests,
            solvedQuestions,
            activityScore,
            weeklyGoal
        );
    }

    // Trending & Suggestions

    @Override
    @Transactional(readOnly = true)
    public List<CommunityDtos.TrendingSkillDto> getTrendingSkills() {
        // Get the top 8 most-taught skills (most users offering them)
        List<Skill> topSkills = skillRepository.findMostTaughtSkills(PageRequest.of(0, 8));

        if (topSkills.isEmpty()) {
            // Fallback: return first 5 skills from catalog
            topSkills = skillRepository.findAll(PageRequest.of(0, 5)).getContent();
        }

        // Count posts per skill for trending metric
        List<CommunityDtos.TrendingSkillDto> result = new ArrayList<>();
        for (int i = 0; i < topSkills.size(); i++) {
            Skill skill = topSkills.get(i);
            long postCount = postRepository.countBySkillId(skill.getId());
            // Growth percent: synthetic but consistent ranking-based value
            int growthPercent = Math.max(1, (topSkills.size() - i) * 4);
            result.add(new CommunityDtos.TrendingSkillDto(
                skill.getId(), skill.getName(), skill.getIcon(), skill.getCategory(),
                postCount, growthPercent
            ));
        }
        return result;
    }

    @Override
    @Transactional(readOnly = true)
    public List<CommunityDtos.SuggestedUserDto> getSuggestedUsers(String userId) {
        User viewer = findUser(userId);
        Set<String> viewerWantedIds = viewer.getSkillsWanted().stream()
            .map(Skill::getId).collect(Collectors.toSet());
        Set<String> viewerOfferedIds = viewer.getSkillsOffered().stream()
            .map(Skill::getId).collect(Collectors.toSet());

        if (viewerWantedIds.isEmpty() && viewerOfferedIds.isEmpty()) {
            return userRepository.findTopMentors(PageRequest.of(0, 5)).stream()
                .filter(u -> !u.getId().equals(userId))
                .limit(4)
                .map(candidate -> {
                    List<String> offeredSkills = candidate.getSkillsOffered().stream().map(Skill::getName).limit(2).toList();
                    String reason = offeredSkills.isEmpty() 
                        ? "Top mentor on SkillEx" 
                        : "Offers " + String.join(", ", offeredSkills);
                    return new CommunityDtos.SuggestedUserDto(
                        candidate.getId(), candidate.getName(), candidate.getUsername(),
                        candidate.getAvatar(), candidate.getUniversity(),
                        candidate.getSkillexScore(), candidate.getIsOnline(),
                        offeredSkills, reason
                    );
                })
                .toList();
        }

        // Find users who OFFER skills that the viewer WANTS to learn
        List<String> candidateIds = viewerWantedIds.isEmpty()
            ? List.of()
            : userRepository.findMatchCandidates(userId, viewerWantedIds, PageRequest.of(0, 20));

        // Also find users who WANT skills that the viewer OFFERS
        List<String> reverseIds = viewerOfferedIds.isEmpty()
            ? List.of()
            : userRepository.findCandidatesByWantedSkills(userId, viewerOfferedIds, PageRequest.of(0, 20));

        Set<String> allCandidateIds = new LinkedHashSet<>(candidateIds);
        allCandidateIds.addAll(reverseIds);
        allCandidateIds.remove(userId);

        if (allCandidateIds.isEmpty()) {
            return userRepository.findTopMentors(PageRequest.of(0, 5)).stream()
                .filter(u -> !u.getId().equals(userId))
                .limit(4)
                .map(candidate -> {
                    List<String> offeredSkills = candidate.getSkillsOffered().stream().map(Skill::getName).limit(2).toList();
                    String reason = offeredSkills.isEmpty() 
                        ? "Top mentor on SkillEx" 
                        : "Offers " + String.join(", ", offeredSkills);
                    return new CommunityDtos.SuggestedUserDto(
                        candidate.getId(), candidate.getName(), candidate.getUsername(),
                        candidate.getAvatar(), candidate.getUniversity(),
                        candidate.getSkillexScore(), candidate.getIsOnline(),
                        offeredSkills, reason
                    );
                })
                .toList();
        }

        List<User> candidates = userRepository.findAllById(allCandidateIds);
        Map<String, List<UserSkillOffered>> offeredByUser = offeredRepo
            .findByIdUserIdIn(allCandidateIds).stream()
            .collect(Collectors.groupingBy(r -> r.getId().getUserId()));

        return candidates.stream()
            .limit(5)
            .map(candidate -> {
                List<String> sharedSkills = offeredByUser
                    .getOrDefault(candidate.getId(), List.of())
                    .stream()
                    .filter(r -> viewerWantedIds.contains(r.getSkill().getId()))
                    .map(r -> r.getSkill().getName())
                    .limit(3)
                    .toList();

                String reason = sharedSkills.isEmpty()
                    ? "Wants to learn what you teach"
                    : "Can teach you " + String.join(", ", sharedSkills);

                return new CommunityDtos.SuggestedUserDto(
                    candidate.getId(), candidate.getName(), candidate.getUsername(),
                    candidate.getAvatar(), candidate.getUniversity(),
                    candidate.getSkillexScore(), candidate.getIsOnline(),
                    sharedSkills, reason
                );
            })
            .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public long getOnlineCount() {
        return userRepository.countByIsOnlineTrue();
    }

    private CommunityDtos.EventDto mapEvent(Event event, String viewerId) {
        String rsvpState = "NONE";
        if (viewerId != null && !viewerId.isBlank()) {
            rsvpState = eventRsvpRepository.findById(new EventRsvp.EventRsvpId(event.getId(), viewerId))
                .map(rsvp -> rsvp.getState().name())
                .orElseGet(() -> event.getAttendees().stream().anyMatch(user -> viewerId.equals(user.getId())) ? "GOING" : "NONE");
        }
        long interestedCount = eventRsvpRepository.countByEvent_IdAndState(event.getId(), EventRsvp.RsvpState.INTERESTED);
        int attendeeCount = event.getAttendees() == null ? 0 : event.getAttendees().size();
        return mapper.toEvent(event, rsvpState, interestedCount, attendeeCount);
    }

    private void upsertRsvp(Event event, User user, EventRsvp.RsvpState state) {
        EventRsvp.EventRsvpId id = new EventRsvp.EventRsvpId(event.getId(), user.getId());
        EventRsvp rsvp = eventRsvpRepository.findById(id).orElseGet(() -> EventRsvp.builder()
            .id(id)
            .event(event)
            .user(user)
            .build());
        rsvp.setState(state);
        eventRsvpRepository.save(rsvp);
    }

    private void assertEventNotPast(Event event) {
        if (event.getEventDate() != null && event.getEventDate().isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("This event has already taken place.");
        }
        if (event.getStatus() == Event.EventStatus.CANCELLED) {
            throw new IllegalArgumentException("This event was cancelled.");
        }
    }

    private EventRsvp.RsvpState currentRsvpState(Event event, String userId) {
        return eventRsvpRepository.findById(new EventRsvp.EventRsvpId(event.getId(), userId))
            .map(EventRsvp::getState)
            .orElseGet(() -> event.getAttendees().stream().anyMatch(user -> userId.equals(user.getId()))
                ? EventRsvp.RsvpState.GOING
                : EventRsvp.RsvpState.NOT_GOING);
    }

    private CommunityDtos.SkillCircleDto mapSkillCircle(SkillCircle circle, String viewerId) {
        long resourceCount = skillCircleResourceRepository.countByCircleId(circle.getId());
        long openHelpCount = discussionRepository.countByCircleIdAndThreadTypeAndStatus(
            circle.getId(),
            Discussion.ThreadType.QUESTION,
            Discussion.DiscussionStatus.OPEN
        );
        long upcomingEventCount = eventRepository.countByCircleIdAndEventDateAfter(circle.getId(), LocalDateTime.now());
        return mapper.toSkillCircle(circle, viewerId, resourceCount, openHelpCount, upcomingEventCount);
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }

    private <E extends Enum<E>> E parseEnum(String value, E fallback, Class<E> enumType) {
        if (value == null || value.isBlank()) {
            return fallback;
        }
        String normalized = value.trim().toUpperCase(Locale.ROOT).replace('-', '_').replace(' ', '_');
        try {
            return Enum.valueOf(enumType, normalized);
        } catch (IllegalArgumentException ex) {
            return fallback;
        }
    }

    private void assertDiscussionAccess(Discussion discussion, String userId) {
        if (discussion.getCircle() == null) {
            return;
        }
        assertCircleMember(
            discussion.getCircle(),
            userId,
            "Join this skill circle before opening or replying to its help desk threads."
        );
    }

    private void assertCircleMember(SkillCircle circle, String userId, String message) {
        if (userId == null || userId.isBlank()) {
            throw new IllegalArgumentException(message);
        }
        boolean member = circle.getMembers().stream()
            .anyMatch(existing -> userId.equals(existing.getId()));
        if (!member) {
            throw new IllegalArgumentException(message);
        }
    }

    private User findUser(String id) {
        return userRepository.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("User not found: " + id));
    }

    /**
     * Maps a page of Post entities to PostDtos with viewer-specific like state.
     * Uses a single bulk query to resolve isLikedByViewer for all posts in the page.
     */
    private PagedResponse<CommunityDtos.PostDto> mapPostsWithLikeState(Page<Post> postPage, String viewerId) {
        List<Post> posts = postPage.getContent();

        // Bulk-resolve which posts the viewer has liked
        Set<String> likedPostIds;
        if (viewerId != null && !viewerId.isBlank() && !posts.isEmpty()) {
            List<String> postIds = posts.stream().map(Post::getId).toList();
            likedPostIds = new HashSet<>(postLikeRepository.findLikedPostIdsByUser(viewerId, postIds));
        } else {
            likedPostIds = Set.of();
        }

        List<CommunityDtos.PostDto> content = posts.stream()
            .map(post -> mapper.toPost(post, likedPostIds.contains(post.getId())))
            .toList();

        return new PagedResponse<>(
            content,
            postPage.getNumber(),
            postPage.getSize(),
            postPage.getTotalElements(),
            postPage.getTotalPages(),
            postPage.isLast()
        );
    }

    private PagedResponse<CommunityDtos.PostDto> mapPostsWithReason(Page<Post> postPage, String viewerId, String reason, int score) {
        List<ScoredPost> scored = postPage.getContent().stream()
            .map(post -> new ScoredPost(post, score, reason))
            .toList();
        Set<String> likedPostIds = likedPostIds(viewerId, postPage.getContent());
        List<CommunityDtos.PostDto> content = scored.stream()
            .map(item -> mapper.toPost(item.post(), likedPostIds.contains(item.post().getId()), item.reason(), item.score()))
            .toList();
        return new PagedResponse<>(
            content,
            postPage.getNumber(),
            postPage.getSize(),
            postPage.getTotalElements(),
            postPage.getTotalPages(),
            postPage.isLast()
        );
    }

    private PagedResponse<CommunityDtos.PostDto> toPagedPosts(List<ScoredPost> scored, String viewerId, int page, int size) {
        int safePage = Math.max(0, page);
        int safeSize = Math.max(1, size);
        int from = Math.min(safePage * safeSize, scored.size());
        int to = Math.min(from + safeSize, scored.size());
        List<ScoredPost> slice = scored.subList(from, to);
        List<Post> posts = slice.stream().map(ScoredPost::post).toList();
        Set<String> likedPostIds = likedPostIds(viewerId, posts);
        List<CommunityDtos.PostDto> content = slice.stream()
            .map(item -> mapper.toPost(item.post(), likedPostIds.contains(item.post().getId()), item.reason(), item.score()))
            .toList();
        int totalPages = scored.isEmpty() ? 0 : (int) Math.ceil(scored.size() / (double) safeSize);
        return new PagedResponse<>(
            content,
            safePage,
            safeSize,
            scored.size(),
            totalPages,
            safePage + 1 >= totalPages
        );
    }

    private Set<String> likedPostIds(String viewerId, List<Post> posts) {
        if (viewerId == null || viewerId.isBlank() || posts.isEmpty()) {
            return Set.of();
        }
        List<String> postIds = posts.stream().map(Post::getId).toList();
        return new HashSet<>(postLikeRepository.findLikedPostIdsByUser(viewerId, postIds));
    }

    private ScoredPost scoreForYou(Post post, Set<String> wantedSkillIds, Set<String> offeredSkillIds, Set<String> connectedUserIds) {
        int score = baseEngagementScore(post);
        List<String> reasons = new ArrayList<>();
        String skillId = post.getSkill() == null ? null : post.getSkill().getId();
        String skillName = post.getSkill() == null ? "this topic" : post.getSkill().getName();
        if (skillId != null && wantedSkillIds.contains(skillId)) {
            score += 60;
            reasons.add("matches a skill you want to learn");
        }
        if (skillId != null && offeredSkillIds.contains(skillId)) {
            score += 25;
            reasons.add("lets you help with " + skillName);
        }
        if (connectedUserIds.contains(post.getAuthor().getId())) {
            score += 30;
            reasons.add("from your network");
        }
        int safetyPenalty = Math.max(0, 100 - restrictionService.safetyScore(post.getAuthor().getId()));
        score -= safetyPenalty;
        if (reasons.isEmpty()) {
            reasons.add(post.getSkill() == null ? "fresh community activity" : "active discussion around " + skillName);
        }
        return new ScoredPost(post, Math.max(0, score), "Shown because it " + String.join(", ", reasons));
    }

    private int baseEngagementScore(Post post) {
        long ageDays = post.getCreatedAt() == null
            ? 30
            : Math.max(0, Duration.between(post.getCreatedAt(), LocalDateTime.now()).toDays());
        int freshness = (int) Math.max(0, 30 - ageDays);
        return freshness + post.getLikes() * 2 + post.getComments() * 3 + post.getShares() * 4;
    }

    private Comparator<ScoredPost> scoredPostComparator() {
        return Comparator.comparingInt(ScoredPost::score).reversed()
            .thenComparing(item -> item.post().getCreatedAt(), Comparator.nullsLast(Comparator.reverseOrder()));
    }

    private record ScoredPost(Post post, int score, String reason) {}
}
