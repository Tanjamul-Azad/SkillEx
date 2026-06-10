import apiClient from './apiClient';

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
  async suggestBios(topic: string): Promise<ProfileAssistantSuggestion> {
    const response = await apiClient.post<{ data: ProfileAssistantSuggestion }>(
      '/ai/profile-assistant/suggest-bio',
      { topic }
    );
    return response.data.data;
  },

  /**
   * Generate 3 polished skill descriptions from skill name and level.
   */
  async suggestSkillDescriptions(
    skillName: string,
    level: string
  ): Promise<ProfileAssistantSuggestion> {
    const response = await apiClient.post<{ data: ProfileAssistantSuggestion }>(
      '/ai/profile-assistant/suggest-skill-description',
      { skillName, level }
    );
    return response.data.data;
  },

  /**
   * Generate 3 compelling circle blurbs from circle name and topic.
   */
  async suggestCircleBlurbs(
    circleName: string,
    topic: string
  ): Promise<ProfileAssistantSuggestion> {
    const response = await apiClient.post<{ data: ProfileAssistantSuggestion }>(
      '/ai/profile-assistant/suggest-circle-blurb',
      { circleName, topic }
    );
    return response.data.data;
  },
};
