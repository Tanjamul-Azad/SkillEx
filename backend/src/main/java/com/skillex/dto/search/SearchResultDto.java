package com.skillex.dto.search;

import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;
import java.util.List;

/**
 * Union type for semantic search results across mentors, skills, discussions, and circles.
 *
 * <p>Uses Jackson's polymorphic deserialization to route to appropriate sub-type
 * based on the "type" discriminator field.
 */
@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, include = JsonTypeInfo.As.PROPERTY, property = "type")
@JsonSubTypes({
    @JsonSubTypes.Type(value = SearchResultDto.MentorResult.class, name = "mentor"),
    @JsonSubTypes.Type(value = SearchResultDto.SkillResult.class, name = "skill"),
    @JsonSubTypes.Type(value = SearchResultDto.DiscussionResult.class, name = "discussion"),
    @JsonSubTypes.Type(value = SearchResultDto.CircleResult.class, name = "circle"),
})
public sealed interface SearchResultDto permits
    SearchResultDto.MentorResult,
    SearchResultDto.SkillResult,
    SearchResultDto.DiscussionResult,
    SearchResultDto.CircleResult {

    double relevanceScore();

    /**
     * Mentor result: name, avatar, top skills, trust score.
     */
    record MentorResult(
        String id,
        String name,
        String avatar,
        String bio,
        List<SkillTag> topSkills,
        double trustScore,
        int sessionsCompleted,
        double avgRating,
        double relevanceScore
    ) implements SearchResultDto {
        @Override
        public double relevanceScore() {
            return relevanceScore;
        }
    }

    /**
     * Skill result: name, icon, mentors offering it, demand level.
     */
    record SkillResult(
        String id,
        String name,
        String icon,
        String category,
        String description,
        int mentorCount,
        int demandLevel,
        double relevanceScore
    ) implements SearchResultDto {
        @Override
        public double relevanceScore() {
            return relevanceScore;
        }
    }

    /**
     * Discussion result: title, author, upvotes, snippet of content.
     */
    record DiscussionResult(
        String id,
        String title,
        String authorId,
        String authorName,
        String authorAvatar,
        int upvotes,
        int replies,
        String snippet,
        String category,
        double relevanceScore
    ) implements SearchResultDto {
        @Override
        public double relevanceScore() {
            return relevanceScore;
        }
    }

    /**
     * Skill Circle result: name, members, description snippet, activity level.
     */
    record CircleResult(
        String id,
        String name,
        String icon,
        String description,
        int memberCount,
        String activityLevel,
        double relevanceScore
    ) implements SearchResultDto {
        @Override
        public double relevanceScore() {
            return relevanceScore;
        }
    }

    /**
     * Lightweight skill tag for mentor results.
     */
    record SkillTag(
        String id,
        String name,
        String icon
    ) {}
}
