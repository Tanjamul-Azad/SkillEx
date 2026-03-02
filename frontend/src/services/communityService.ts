import type { Event, Discussion, Post, Story, SkillCircle } from '@/types';
import { api } from './api';

/**
 * CommunityService — community-related API calls.
 *
 * Every method maps to a Spring Boot REST endpoint under /api/community/*.
 * The service layer is decoupled from components — swap mock data for real API
 * by adding fetch logic here without touching any component.
 */
export const CommunityService = {
  getEvents: async (): Promise<Event[]> => api.get<Event[]>('/community/events'),
  getDiscussions: async (): Promise<Discussion[]> => api.get<Discussion[]>('/community/discussions'),
  getPosts: async (): Promise<Post[]> => api.get<Post[]>('/community/posts'),
  getStories: async (): Promise<Story[]> => api.get<Story[]>('/community/stories'),
  getSkillCircles: async (): Promise<SkillCircle[]> => api.get<SkillCircle[]>('/community/skill-circles'),
};
