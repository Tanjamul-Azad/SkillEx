package com.skillex.service.impl;

import com.skillex.dto.search.SearchResultDto;
import com.skillex.dto.search.SearchResultDto.CircleResult;
import com.skillex.dto.search.SearchResultDto.DiscussionResult;
import com.skillex.dto.search.SearchResultDto.MentorResult;
import com.skillex.dto.search.SearchResultDto.SkillResult;
import com.skillex.dto.search.SearchResultDto.SkillTag;
import com.skillex.model.Discussion;
import com.skillex.model.Skill;
import com.skillex.model.SkillCircle;
import com.skillex.model.User;
import com.skillex.model.UserSkillOffered;
import com.skillex.repository.DiscussionRepository;
import com.skillex.repository.SkillCircleRepository;
import com.skillex.repository.SkillEmbeddingRepository;
import com.skillex.repository.SkillRepository;
import com.skillex.repository.UserRepository;
import com.skillex.repository.UserSkillOfferedRepository;
import com.skillex.service.UnifiedSearchService;
import com.skillex.service.embedding.TextEmbeddingProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Unified semantic search across mentors, skills, discussions, and skill circles.
 *
 * <p>Strategy:
 * 1. Generate embedding for query text using the same provider as skills
 * 2. Load all skill embeddings and compute similarity scores
 * 3. Fetch mentors, discussions, circles and compute semantic relevance
 * 4. Combine and rank by relevance score
 *
 * <p>Relevance computation:
 * - Mentors: average similarity of their offered skills to query
 * - Skills: direct embedding similarity
 * - Discussions: similarity of title+snippet to query
 * - Circles: similarity of name+description to query
 */
@Service
@Slf4j
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UnifiedSearchServiceImpl implements UnifiedSearchService {

    private static final double MIN_RELEVANCE = 0.3; // Semantic threshold
    private static final int DEFAULT_LIMIT = 20;

    private final TextEmbeddingProvider embeddingProvider;
    private final SkillRepository skillRepository;
    private final SkillEmbeddingRepository skillEmbeddingRepository;
    private final UserRepository userRepository;
    private final UserSkillOfferedRepository userSkillOfferedRepository;
    private final DiscussionRepository discussionRepository;
    private final SkillCircleRepository skillCircleRepository;

    @Override
    public List<SearchResultDto> search(String query, int limit) {
        if (query == null || query.isBlank()) {
            return List.of();
        }

        // Generate query embedding
        double[] queryEmbedding = embeddingProvider.getEmbedding(query.strip());

        // Collect all results from all sources
        List<SearchResultDto> allResults = new ArrayList<>();

        // Search mentors
        allResults.addAll(searchMentors(queryEmbedding, limit));

        // Search skills
        allResults.addAll(searchSkills(queryEmbedding, limit));

        // Search discussions
        allResults.addAll(searchDiscussions(queryEmbedding, limit));

        // Search circles
        allResults.addAll(searchCircles(queryEmbedding, limit));

        // Sort by relevance and limit
        return allResults.stream()
            .sorted(Comparator.comparingDouble(SearchResultDto::relevanceScore).reversed())
            .limit(Math.min(limit, DEFAULT_LIMIT))
            .collect(Collectors.toList());
    }

    @Override
    public GroupedSearchResults searchGrouped(String query, int limit) {
        if (query == null || query.isBlank()) {
            return new GroupedSearchResults(List.of(), List.of(), List.of(), List.of());
        }

        double[] queryEmbedding = embeddingProvider.getEmbedding(query.strip());

        return new GroupedSearchResults(
            searchMentors(queryEmbedding, limit).stream()
                .filter(r -> r instanceof MentorResult)
                .map(r -> (MentorResult) r)
                .collect(Collectors.toList()),
            searchSkills(queryEmbedding, limit).stream()
                .filter(r -> r instanceof SkillResult)
                .map(r -> (SkillResult) r)
                .collect(Collectors.toList()),
            searchDiscussions(queryEmbedding, limit).stream()
                .filter(r -> r instanceof DiscussionResult)
                .map(r -> (DiscussionResult) r)
                .collect(Collectors.toList()),
            searchCircles(queryEmbedding, limit).stream()
                .filter(r -> r instanceof CircleResult)
                .map(r -> (CircleResult) r)
                .collect(Collectors.toList())
        );
    }

    // ── Mentor search ────────────────────────────────────────────────────────

    private List<SearchResultDto> searchMentors(double[] queryEmbedding, int limit) {
        List<User> allUsers = userRepository.findAll();
        List<SearchResultDto> results = new ArrayList<>();

        // Load skill embeddings for similarity computation
        Map<String, double[]> skillEmbeddings = skillEmbeddingRepository.findAll().stream()
            .collect(Collectors.toMap(
                se -> se.getSkillId(),
                se -> parseVector(se.getVectorJson())
            ));

        for (User user : allUsers) {
            // Get their offered skills
            List<UserSkillOffered> offeredSkills = userSkillOfferedRepository.findByUserId(user.getId());

            if (offeredSkills.isEmpty()) {
                continue; // Skip users who aren't mentoring
            }

            // Compute average skill relevance
            double relevanceSum = 0.0;
            int count = 0;
            for (UserSkillOffered offered : offeredSkills) {
                String skillId = offered.getSkill().getId();
                double[] skillVector = skillEmbeddings.get(skillId);
                if (skillVector != null) {
                    relevanceSum += cosineSimilarity(queryEmbedding, skillVector);
                    count++;
                }
            }

            double relevance = count > 0 ? relevanceSum / count : 0.0;

            if (relevance >= MIN_RELEVANCE) {
                // Get top 3 skills
                List<SkillTag> topSkills = offeredSkills.stream()
                    .limit(3)
                    .map(o -> new SkillTag(
                        o.getSkill().getId(),
                        o.getSkill().getName(),
                        o.getSkill().getIcon()
                    ))
                    .collect(Collectors.toList());

                double avgRating = user.getRating() != null ? user.getRating().doubleValue() : 0.0;
                int sessionsCompleted = user.getSessionsCompleted() != null ? user.getSessionsCompleted() : 0;

                MentorResult result = new MentorResult(
                    user.getId(),
                    user.getName(),
                    user.getAvatar(),
                    user.getBio() != null ? user.getBio() : "",
                    topSkills,
                    avgRating,
                    sessionsCompleted,
                    avgRating,
                    relevance
                );
                results.add(result);
            }
        }

        return results.stream()
            .sorted(Comparator.comparingDouble(SearchResultDto::relevanceScore).reversed())
            .limit(limit)
            .collect(Collectors.toList());
    }

    // ── Skill search ────────────────────────────────────────────────────────

    private List<SearchResultDto> searchSkills(double[] queryEmbedding, int limit) {
        List<Skill> allSkills = skillRepository.findAll();
        List<SearchResultDto> results = new ArrayList<>();

        // Load skill embeddings
        Map<String, double[]> skillEmbeddings = skillEmbeddingRepository.findAll().stream()
            .collect(Collectors.toMap(
                se -> se.getSkillId(),
                se -> parseVector(se.getVectorJson())
            ));

        for (Skill skill : allSkills) {
            double[] skillVector = skillEmbeddings.get(skill.getId());
            if (skillVector == null) {
                continue;
            }

            double relevance = cosineSimilarity(queryEmbedding, skillVector);

            if (relevance >= MIN_RELEVANCE) {
                // Count mentors offering this skill
                long mentorCount = userSkillOfferedRepository.findBySkillId(skill.getId())
                    .size();

                SkillResult result = new SkillResult(
                    skill.getId(),
                    skill.getName(),
                    skill.getIcon(),
                    skill.getCategory(),
                    skill.getDescription() != null ? skill.getDescription() : "",
                    (int) mentorCount,
                    0, // demandLevel - would compute from discussions/matches
                    relevance
                );
                results.add(result);
            }
        }

        return results.stream()
            .sorted(Comparator.comparingDouble(SearchResultDto::relevanceScore).reversed())
            .limit(limit)
            .collect(Collectors.toList());
    }

    // ── Discussion search ────────────────────────────────────────────────────

    private List<SearchResultDto> searchDiscussions(double[] queryEmbedding, int limit) {
        List<Discussion> allDiscussions = discussionRepository.findAll();
        List<SearchResultDto> results = new ArrayList<>();

        for (Discussion discussion : allDiscussions) {
            // Combine title and content for semantic similarity
            String searchText = discussion.getTitle() + " " + truncate(discussion.getContent(), 200);
            double[] textEmbedding = embeddingProvider.getEmbedding(searchText);

            double relevance = cosineSimilarity(queryEmbedding, textEmbedding);

            if (relevance >= MIN_RELEVANCE) {
                String snippet = truncate(discussion.getContent(), 150);

                DiscussionResult result = new DiscussionResult(
                    discussion.getId(),
                    discussion.getTitle(),
                    discussion.getAuthor().getId(),
                    discussion.getAuthor().getName(),
                    discussion.getAuthor().getAvatar(),
                    discussion.getUpvotes(),
                    discussion.getReplies(),
                    snippet,
                    discussion.getCategory(),
                    relevance
                );
                results.add(result);
            }
        }

        return results.stream()
            .sorted(Comparator.comparingDouble(SearchResultDto::relevanceScore).reversed())
            .limit(limit)
            .collect(Collectors.toList());
    }

    // ── Circle search ────────────────────────────────────────────────────────

    private List<SearchResultDto> searchCircles(double[] queryEmbedding, int limit) {
        List<SkillCircle> allCircles = skillCircleRepository.findAll();
        List<SearchResultDto> results = new ArrayList<>();

        for (SkillCircle circle : allCircles) {
            // Combine name and description
            String searchText = circle.getName() + " " + (circle.getDescription() != null ? circle.getDescription() : "");
            double[] textEmbedding = embeddingProvider.getEmbedding(searchText);

            double relevance = cosineSimilarity(queryEmbedding, textEmbedding);

            if (relevance >= MIN_RELEVANCE) {
                CircleResult result = new CircleResult(
                    circle.getId(),
                    circle.getName(),
                    circle.getIcon(),
                    circle.getDescription() != null ? circle.getDescription() : "",
                    circle.getMemberCount(),
                    circle.getActivity().name(),
                    relevance
                );
                results.add(result);
            }
        }

        return results.stream()
            .sorted(Comparator.comparingDouble(SearchResultDto::relevanceScore).reversed())
            .limit(limit)
            .collect(Collectors.toList());
    }

    // ── Utility methods ──────────────────────────────────────────────────────

    private double cosineSimilarity(double[] left, double[] right) {
        if (left == null || right == null || left.length == 0 || right.length == 0 || left.length != right.length) {
            return 0.0;
        }

        double dot = 0.0;
        double leftNorm = 0.0;
        double rightNorm = 0.0;

        for (int i = 0; i < left.length; i++) {
            dot += left[i] * right[i];
            leftNorm += left[i] * left[i];
            rightNorm += right[i] * right[i];
        }

        if (leftNorm == 0.0 || rightNorm == 0.0) {
            return 0.0;
        }

        double cosine = dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
        return Math.max(0.0, Math.min(1.0, cosine));
    }

    private double[] parseVector(String vectorJson) {
        try {
            // Parse JSON array to double[]
            String[] parts = vectorJson.trim()
                .replaceAll("[\\[\\]]", "")
                .split(",");
            double[] vector = new double[parts.length];
            for (int i = 0; i < parts.length; i++) {
                vector[i] = Double.parseDouble(parts[i].trim());
            }
            return vector;
        } catch (Exception e) {
            log.warn("Failed to parse vector: {}", vectorJson, e);
            return new double[0];
        }
    }

    private String truncate(String text, int maxLen) {
        if (text == null) return "";
        if (text.length() <= maxLen) return text;
        return text.substring(0, maxLen) + "...";
    }
}
