package com.skillex.service.impl;

import com.skillex.dto.common.PagedResponse;
import com.skillex.dto.community.*;
import com.skillex.dto.skill.SkillSearchResultDto;
import com.skillex.model.*;
import com.skillex.repository.*;
import com.skillex.service.CommunityService;
import com.skillex.service.CreditService;
import com.skillex.service.DtoMapper;
import com.skillex.service.AccountRestrictionService;
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
    private final PostLikeRepository postLikeRepository;
    private final DiscussionUpvoteRepository discussionUpvoteRepository;
    private final CommentRepository commentRepository;
    private final ConnectionRepository connectionRepository;
    private final UserSkillOfferedRepository offeredRepo;
    private final SkillService skillService;
    private final DtoMapper mapper;
    private final ApplicationEventPublisher eventPublisher;
    private final AccountRestrictionService restrictionService;
    private final CreditService creditService;

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
    public PagedResponse<CommunityDtos.DiscussionDto> getDiscussions(String viewerId, int page, int size) {
        var pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<Discussion> discussionPage = discussionRepository.findAll(pageable);
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
        discussion.setCategory(req.category());
        discussion.setUpvotes(0);
        discussion.setReplies(0);
        discussion.setViews(0);
        discussion.setIsPinned(false);
        CommunityDtos.DiscussionDto result = mapper.toDiscussion(discussionRepository.save(discussion));

        eventPublisher.publishEvent(new ReputationUpdateEvent(
            authorId, ReputationUpdateEvent.Trigger.COMMUNITY_INTERACTION));

        return result;
    }

    @Override
    @Transactional
    public CommunityDtos.DiscussionDto upvoteDiscussion(String userId, String discussionId) {
        restrictionService.assertCanUseAccount(userId, "COMMUNITY");
        Discussion discussion = discussionRepository.findById(discussionId)
            .orElseThrow(() -> new EntityNotFoundException("Discussion not found: " + discussionId));
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

    // ── Posts ────────────────────────────────────────────────────────────────

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

    // ── Comments ─────────────────────────────────────────────────────────────

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

        return mapper.toComment(saved);
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
    public CommunityDtos.SkillCircleDto createSkillCircle(String creatorId, CreateSkillCircleRequest req) {
        restrictionService.assertCanUseAccount(creatorId, "COMMUNITY");
        User creator = findUser(creatorId);
        SkillCircle circle = new SkillCircle();
        circle.setName(req.name());
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

        SkillCircle saved = skillCircleRepository.save(circle);
        return mapper.toSkillCircle(saved);
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

    // ── Trending & Suggestions ───────────────────────────────────────────────

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
