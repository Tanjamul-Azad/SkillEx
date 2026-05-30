import type { Event, Discussion, Post, Story, SkillCircle, Comment, TrendingSkill, SuggestedUser } from '@/types';
import { api } from './api';

export interface PagedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
  last: boolean;
}

const normalizePost = (post: Post): Post => ({
  ...post,
  type: String(post.type).toLowerCase() as Post['type'],
  createdAt: post.createdAt ?? new Date().toISOString(),
  likes: Number(post.likes ?? 0),
  comments: Number(post.comments ?? 0),
});

const normalizePostPage = (page: PagedResponse<Post>): PagedResponse<Post> => ({
  ...page,
  content: (page.content ?? []).map(normalizePost),
});

const normalizeDiscussion = (discussion: Discussion): Discussion => ({
  ...discussion,
  createdAt: discussion.createdAt ?? new Date().toISOString(),
  upvotes: Number(discussion.upvotes ?? 0),
  replies: Number(discussion.replies ?? 0),
  views: Number(discussion.views ?? 0),
});

const normalizeDiscussionPage = (page: PagedResponse<Discussion>): PagedResponse<Discussion> => ({
  ...page,
  content: (page.content ?? []).map(normalizeDiscussion),
});

/**
 * CommunityService — community-related API calls.
 * All methods map to Spring Boot REST endpoints under /api/community/*.
 */
export const CommunityService = {
  // ── Events ────────────────────────────────────────────────────────────────
  getEvents: (page = 0, size = 20): Promise<PagedResponse<Event>> =>
    api.get<PagedResponse<Event>>(`/community/events?page=${page}&size=${size}`),

  attendEvent: (eventId: string): Promise<void> =>
    api.post<void>(`/community/events/${eventId}/attend`, {}),

  // ── Discussions ────────────────────────────────────────────────────────────
  getDiscussions: async (page = 0, size = 20): Promise<PagedResponse<Discussion>> =>
    normalizeDiscussionPage(await api.get<PagedResponse<Discussion>>(`/community/discussions?page=${page}&size=${size}`)),

  upvoteDiscussion: async (discussionId: string): Promise<Discussion> =>
    normalizeDiscussion(await api.post<Discussion>(`/community/discussions/${discussionId}/upvote`, {})),

  // ── Posts ──────────────────────────────────────────────────────────────────
  getPosts: async (page = 0, size = 20): Promise<PagedResponse<Post>> =>
    normalizePostPage(await api.get<PagedResponse<Post>>(`/community/posts?page=${page}&size=${size}`)),

  getFeed: (mode = 'for-you', skillId?: string, page = 0, size = 20): Promise<PagedResponse<Post>> => {
    const params = new URLSearchParams({ mode, page: String(page), size: String(size) });
    if (skillId) params.set('skillId', skillId);
    return api.get<PagedResponse<Post>>(`/community/feed?${params.toString()}`).then(normalizePostPage);
  },

  searchPosts: async (intent: string, page = 0, size = 20): Promise<PagedResponse<Post>> =>
    normalizePostPage(await api.get<PagedResponse<Post>>(`/community/posts/search?intent=${encodeURIComponent(intent)}&page=${page}&size=${size}`)),

  getUserPosts: async (userId: string, page = 0, size = 10): Promise<PagedResponse<Post>> =>
    normalizePostPage(await api.get<PagedResponse<Post>>(`/community/posts/user/${userId}?page=${page}&size=${size}`)),

  createPost: async (data: { type: string; content: string; skillId?: string; mediaUrl?: string }): Promise<Post> =>
    normalizePost(await api.post<Post>('/community/posts', data)),

  likePost: async (postId: string): Promise<Post> =>
    normalizePost(await api.post<Post>(`/community/posts/${postId}/like`, {})),

  unlikePost: async (postId: string): Promise<Post> =>
    normalizePost(await api.post<Post>(`/community/posts/${postId}/unlike`, {})),

  deletePost: (postId: string): Promise<void> =>
    api.delete<void>(`/community/posts/${postId}`),

  // ── Comments ──────────────────────────────────────────────────────────────
  getComments: (postId: string, page = 0, size = 20): Promise<PagedResponse<Comment>> =>
    api.get<PagedResponse<Comment>>(`/community/posts/${postId}/comments?page=${page}&size=${size}`),

  addComment: (postId: string, content: string): Promise<Comment> =>
    api.post<Comment>(`/community/posts/${postId}/comments`, { content }),

  // ── Stories ────────────────────────────────────────────────────────────────
  /** Stories endpoint returns a plain list (not paged) */
  getStories: (): Promise<Story[]> => api.get<Story[]>('/community/stories'),

  // ── Skill Circles ──────────────────────────────────────────────────────────
  getSkillCircles: (page = 0, size = 20): Promise<PagedResponse<SkillCircle>> =>
    api.get<PagedResponse<SkillCircle>>(`/community/skill-circles?page=${page}&size=${size}`),

  joinCircle: (circleId: string): Promise<SkillCircle> =>
    api.post<SkillCircle>(`/community/skill-circles/${circleId}/join`, {}),

  // ── Trending & Suggestions ─────────────────────────────────────────────────
  getTrendingSkills: (): Promise<TrendingSkill[]> =>
    api.get<TrendingSkill[]>('/community/trending-skills'),

  getSuggestedUsers: (): Promise<SuggestedUser[]> =>
    api.get<SuggestedUser[]>('/community/suggested-users'),

  getOnlineCount: (): Promise<{ count: number }> =>
    api.get<{ count: number }>('/community/online-count'),

  uploadMedia: async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post<{ url: string }>('/upload', formData);
    return res.url;
  },
};
