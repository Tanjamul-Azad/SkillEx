import { api } from './api';

/**
 * Lightweight skill tag in mentor results.
 */
export interface SkillTag {
  id: string;
  name: string;
  icon: string;
}

/**
 * Base type for all search results (discriminated union).
 */
export type SearchResult =
  | MentorResult
  | SkillResult
  | DiscussionResult
  | CircleResult;

/**
 * Mentor result: name, avatar, top skills, trust score.
 */
export interface MentorResult {
  type: 'mentor';
  id: string;
  name: string;
  avatar: string | null;
  bio: string;
  topSkills: SkillTag[];
  trustScore: number;
  sessionsCompleted: number;
  avgRating: number;
  relevanceScore: number;
}

/**
 * Skill result: name, icon, mentors offering it, demand level.
 */
export interface SkillResult {
  type: 'skill';
  id: string;
  name: string;
  icon: string;
  category: string;
  description: string;
  mentorCount: number;
  demandLevel: number;
  relevanceScore: number;
}

/**
 * Discussion result: title, author, upvotes, snippet.
 */
export interface DiscussionResult {
  type: 'discussion';
  id: string;
  title: string;
  authorId: string;
  authorName: string;
  authorAvatar: string | null;
  upvotes: number;
  replies: number;
  snippet: string;
  category: string;
  relevanceScore: number;
}

/**
 * Skill Circle result: name, members, activity level.
 */
export interface CircleResult {
  type: 'circle';
  id: string;
  name: string;
  icon: string;
  description: string;
  memberCount: number;
  activityLevel: string;
  relevanceScore: number;
}

/**
 * Grouped search results by type.
 */
export interface GroupedSearchResults {
  mentors: MentorResult[];
  skills: SkillResult[];
  discussions: DiscussionResult[];
  circles: CircleResult[];
}

/**
 * Search service for unified semantic search.
 */
export const SearchService = {
  /**
   * Execute unified semantic search across all content types.
   *
   * @param query - Free-text search query
   * @param limit - Maximum number of results (default 20)
   * @returns Mixed results sorted by relevance score
   */
  search: async (query: string, limit: number = 20): Promise<SearchResult[]> => {
    if (!query || query.trim().length === 0) {
      return [];
    }

    try {
      const results = await api.get<SearchResult[]>(
        `/search?query=${encodeURIComponent(query)}&limit=${limit}`
      );
      return results || [];
    } catch (error) {
      console.error('[SearchService] Search failed:', error);
      return [];
    }
  },

  /**
   * Execute semantic search with results grouped by type.
   *
   * @param query - Free-text search query
   * @param limit - Maximum number of results per category (default 10)
   * @returns Grouped results (mentors, skills, discussions, circles)
   */
  searchGrouped: async (
    query: string,
    limit: number = 10
  ): Promise<GroupedSearchResults> => {
    if (!query || query.trim().length === 0) {
      return {
        mentors: [],
        skills: [],
        discussions: [],
        circles: [],
      };
    }

    try {
      const results = await api.get<GroupedSearchResults>(
        `/search/grouped?query=${encodeURIComponent(query)}&limit=${limit}`
      );
      return results || {
        mentors: [],
        skills: [],
        discussions: [],
        circles: [],
      };
    } catch (error) {
      console.error('[SearchService] Grouped search failed:', error);
      return {
        mentors: [],
        skills: [],
        discussions: [],
        circles: [],
      };
    }
  },

  /**
   * Get autocomplete suggestions for a partial query.
   * Currently uses full search but can be optimized later.
   *
   * @param query - Partial search query
   * @returns Top 10 results by relevance
   */
  autocomplete: async (query: string): Promise<SearchResult[]> => {
    return SearchService.search(query, 10);
  },
};
