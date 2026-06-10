package com.skillex.service;

import com.skillex.dto.ai.ProfileAssistantSuggestionDto;

/**
 * Service for generating polished profile content (bios, skill descriptions, circle blurbs) using AI.
 * Uses local Ollama for privacy-preserving suggestions.
 */
public interface ProfileAssistantService {

    /**
     * Generate 3 professional bio variations from a user's one-sentence self-description.
     * @param topic User's rough description or topic (e.g., "I'm a software engineer interested in startups")
     * @return 3 polished bio suggestions
     */
    ProfileAssistantSuggestionDto suggestBios(String topic);

    /**
     * Generate 3 polished skill descriptions from skill name and proficiency level.
     * @param skillName The skill name (e.g., "JavaScript", "Public Speaking")
     * @param level The proficiency level (e.g., "NEWCOMER", "PRACTITIONER", "ADVANCED")
     * @return 3 skill description suggestions
     */
    ProfileAssistantSuggestionDto suggestSkillDescriptions(String skillName, String level);

    /**
     * Generate 3 compelling circle blurbs for a skill circle or community group.
     * @param circleName The name of the circle/group
     * @param topic The main topic or focus of the circle
     * @return 3 blurb suggestions
     */
    ProfileAssistantSuggestionDto suggestCircleBlurbs(String circleName, String topic);
}
