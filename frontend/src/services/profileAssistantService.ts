import { api } from './api';

export interface ProfileAssistantSuggestion {
  suggestions: string[];
  generatedAt: string;
  model: string;
}

/**
 * Service for interacting with the AI Profile Assistant backend.
 * Provides methods to generate bios, skill descriptions, and circle blurbs.
 */
export const profileAssistantService = {
  /**
   * Generate 3 professional bio suggestions from a rough self-description.
   */
  suggestBios(topic: string): Promise<ProfileAssistantSuggestion> {
    return api.post<ProfileAssistantSuggestion>(
      '/ai/profile-assistant/suggest-bio',
      { topic }
    );
  },

  /**
   * Generate 3 polished skill descriptions from skill name and level.
   */
  suggestSkillDescriptions(
    skillName: string,
    level: string
  ): Promise<ProfileAssistantSuggestion> {
    return api.post<ProfileAssistantSuggestion>(
      '/ai/profile-assistant/suggest-skill-description',
      { skillName, level }
    );
  },

  /**
   * Generate 3 compelling circle blurbs from circle name and topic.
   */
  suggestCircleBlurbs(
    circleName: string,
    topic: string
  ): Promise<ProfileAssistantSuggestion> {
    return api.post<ProfileAssistantSuggestion>(
      '/ai/profile-assistant/suggest-circle-blurb',
      { circleName, topic }
    );
  },
};
