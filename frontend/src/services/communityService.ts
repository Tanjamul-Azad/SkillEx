import type {
  Event,
  Discussion,
  Post,
  Story,
  SkillCircle,
  Comment,
  TrendingSkill,
  SuggestedUser,
  CircleResource,
  DiscussionReply,
  SkillCircleDashboard,
} from '@/types';
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
  status: discussion.status ?? 'OPEN',
  threadType: discussion.threadType ?? 'QUESTION',
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

  getEvent: (eventId: string): Promise<Event> =>
    api.get<Event>(`/community/events/${eventId}`),

  getUserEvents: (
    userId: string,
    relation: 'hosted' | 'rsvp' | 'going' | 'interested' = 'rsvp',
    page = 0,
    size = 6,
  ): Promise<PagedResponse<Event>> =>
    api.get<PagedResponse<Event>>(`/community/users/${userId}/events?relation=${relation}&page=${page}&size=${size}`),

  createEvent: (data: {
    title: string;
    description?: string;
    eventDate: string;
    location?: string;
    isOnline: boolean;
    eventType?: string;
    circleId?: string;
    meetingUrl?: string;
    coverGradient?: string;
    skillIds?: string[];
  }): Promise<Event> =>
    api.post<Event>('/community/events', data),

  attendEvent: (eventId: string): Promise<Event> =>
    api.post<Event>(`/community/events/${eventId}/attend`, {}),

  interestEvent: (eventId: string): Promise<Event> =>
    api.post<Event>(`/community/events/${eventId}/interest`, {}),

  // ── Discussions ────────────────────────────────────────────────────────────
  getDiscussions: async (
    page = 0,
    size = 20,
    filters: {
      category?: string;
      threadType?: string;
      status?: string;
      circleId?: string;
      skillId?: string;
      eventId?: string;
    } = {},
  ): Promise<PagedResponse<Discussion>> => {
    const params = new URLSearchParams({ page: String(page), size: String(size) });
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== 'All') params.set(key, value);
    });
    return normalizeDiscussionPage(await api.get<PagedResponse<Discussion>>(`/community/discussions?${params.toString()}`));
  },

  createDiscussion: async (data: {
    title: string;
    content: string;
    category?: string;
    threadType?: string;
    skillId?: string;
    circleId?: string;
    eventId?: string;
    coverImageUrl?: string | null;
  }): Promise<Discussion> =>
    normalizeDiscussion(await api.post<Discussion>('/community/discussions', data)),

  getDiscussion: async (discussionId: string): Promise<Discussion> =>
    normalizeDiscussion(await api.get<Discussion>(`/community/discussions/${discussionId}`)),

  upvoteDiscussion: async (discussionId: string): Promise<Discussion> =>
    normalizeDiscussion(await api.post<Discussion>(`/community/discussions/${discussionId}/upvote`, {})),

  getDiscussionReplies: (discussionId: string, page = 0, size = 20): Promise<PagedResponse<DiscussionReply>> =>
    api.get<PagedResponse<DiscussionReply>>(`/community/discussions/${discussionId}/replies?page=${page}&size=${size}`),

  addDiscussionReply: (discussionId: string, content: string): Promise<DiscussionReply> =>
    api.post<DiscussionReply>(`/community/discussions/${discussionId}/replies`, { content }),

  acceptDiscussionReply: async (discussionId: string, replyId: string): Promise<Discussion> =>
    normalizeDiscussion(await api.post<Discussion>(`/community/discussions/${discussionId}/replies/${replyId}/accept`, {})),

  resolveDiscussion: async (discussionId: string): Promise<Discussion> =>
    normalizeDiscussion(await api.patch<Discussion>(`/community/discussions/${discussionId}/resolve`, {})),

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

  getSkillCircle: (circleId: string): Promise<SkillCircle> =>
    api.get<SkillCircle>(`/community/skill-circles/${circleId}`),

  getCircleDashboard: (circleId: string): Promise<SkillCircleDashboard> =>
    api.get<SkillCircleDashboard>(`/community/skill-circles/${circleId}/dashboard`),

  getCircleResources: (circleId: string, page = 0, size = 20): Promise<PagedResponse<CircleResource>> =>
    api.get<PagedResponse<CircleResource>>(`/community/skill-circles/${circleId}/resources?page=${page}&size=${size}`),

  createCircleResource: (circleId: string, data: {
    title: string;
    url?: string;
    notes?: string;
    resourceType?: string;
    difficulty?: string;
    skillId?: string;
  }): Promise<CircleResource> =>
    api.post<CircleResource>(`/community/skill-circles/${circleId}/resources`, data),

  createSkillCircle: (data: {
    name: string;
    description?: string;
    icon?: string;
    skillIds?: string[];
    coverImageUrl?: string | null;
  }): Promise<SkillCircle> =>
    api.post<SkillCircle>('/community/skill-circles', data),

  joinCircle: (circleId: string): Promise<SkillCircle> =>
    api.post<SkillCircle>(`/community/skill-circles/${circleId}/join`, {}),

  leaveCircle: (circleId: string): Promise<SkillCircle> =>
    api.post<SkillCircle>(`/community/skill-circles/${circleId}/leave`, {}),

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
