import type { Event, Discussion, Post, Story, SkillCircle } from '@/types';
import { api } from './api';

export interface PagedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

/**
 * CommunityService — community-related API calls.
 * All methods map to Spring Boot REST endpoints under /api/community/*.
 */
export const CommunityService = {
  getEvents: (page = 0, size = 20): Promise<PagedResponse<Event>> =>
    api.get<PagedResponse<Event>>(`/community/events?page=${page}&size=${size}`),

  getDiscussions: (page = 0, size = 20): Promise<PagedResponse<Discussion>> =>
    api.get<PagedResponse<Discussion>>(`/community/discussions?page=${page}&size=${size}`),

  getPosts: (page = 0, size = 20): Promise<PagedResponse<Post>> =>
    api.get<PagedResponse<Post>>(`/community/posts?page=${page}&size=${size}`),

  /** Stories endpoint returns a plain list (not paged) */
  getStories: (): Promise<Story[]> => api.get<Story[]>('/community/stories'),

  getSkillCircles: (page = 0, size = 20): Promise<PagedResponse<SkillCircle>> =>
    api.get<PagedResponse<SkillCircle>>(`/community/skill-circles?page=${page}&size=${size}`),

  attendEvent: (eventId: string): Promise<void> =>
    api.post<void>(`/community/events/${eventId}/attend`, {}),

  joinCircle: (circleId: string): Promise<SkillCircle> =>
    api.post<SkillCircle>(`/community/skill-circles/${circleId}/join`, {}),

  likePost: (postId: string): Promise<Post> =>
    api.post<Post>(`/community/posts/${postId}/like`, {}),

  upvoteDiscussion: (discussionId: string): Promise<Discussion> =>
    api.post<Discussion>(`/community/discussions/${discussionId}/upvote`, {}),
};
