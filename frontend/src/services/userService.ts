import { User, type Skill } from '@/types';
import { api } from './api';

export interface UserSearchResult {
  id: string;
  displayName: string;
  username: string;
  avatar: string | null;
  university: string | null;
  reputationScore: number;
  rating: number;
  sessionsCompleted: number;
  matchPercent: number;
  isOnline: boolean;
  topSkillsOffered: string[];
  topSkillsWanted: string[];
}

export const UserService = {
  /** GET /api/users/search?q=&page=0&size=20  (page is 0-based on backend) */
  getAll: async (page = 1, size = 10, search?: string) => {
    const result = await UserService.searchPeople(search ?? '', page, size);
    return {
      content: result.content.map(searchResultToUser),
      totalElements: result.totalElements,
    };
  },

  /** GET /api/users/search?q=&page=0&size=20 — rich people search cards */
  searchPeople: async (query = '', page = 1, size = 10) => {
    const params = new URLSearchParams({
      page: (page - 1).toString(),
      size: size.toString(),
    });
    if (query.trim()) params.append('q', query.trim());
    return api.get<{ content: UserSearchResult[]; totalElements: number }>(`/users/search?${params.toString()}`);
  },

  getById: async (id: string) => {
    return api.get<User>(`/users/${id}`);
  },

  /** Update authenticated user's own profile (PATCH /api/users/me) */
  updateProfile: async (_id: string, data: Partial<Omit<User, 'id' | 'email'>>) => {
    return api.patch<User>('/users/me', data);
  },

  /** Upload a file (POST /api/upload) */
  uploadFile: async (file: File): Promise<{ url: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<{ url: string }>('/upload', formData);
  },

  /** POST /api/users/me/skills — add an existing catalog skill */
  addSkill: async (skillId: string, type: 'offered' | 'wanted', level = 'BEGINNER', proofVideoUrl?: string, subtitle?: string): Promise<void> => {
    return api.post<void>('/users/me/skills', { skillId, type, level: level.toUpperCase(), proofVideoUrl, subtitle });
  },

  /** POST /api/users/me/skills — add a custom (non-catalog) skill by name */
  addCustomSkill: async (
    skillName: string,
    skillCategory: string,
    type: 'offered' | 'wanted',
    level = 'BEGINNER',
    proofVideoUrl?: string,
    subtitle?: string,
    aiSuggested = false
  ): Promise<void> => {
    return api.post<void>('/users/me/skills', {
      skillName,
      skillCategory,
      type,
      level: level.toUpperCase(),
      proofVideoUrl,
      subtitle,
      aiSuggested,
    });
  },

  /** DELETE /api/users/me/skills/{skillId}?type=offered|wanted */
  removeSkill: async (skillId: string, type: 'offered' | 'wanted'): Promise<void> => {
    return api.delete<void>(`/users/me/skills/${skillId}?type=${type}`);
  },

  /** DELETE /api/users/me — permanently delete authenticated user's account */
  deleteAccount: async (): Promise<void> => {
    return api.delete<void>('/users/me');
  },

  /** POST /api/users/me/connect-email/request-otp */
  requestEmailConnectOtp: async (email: string): Promise<void> => {
    return api.post<void>('/users/me/connect-email/request-otp', { email });
  },

  /** POST /api/users/me/connect-email/verify-otp */
  verifyEmailConnectOtp: async (email: string, otp: string): Promise<void> => {
    return api.post<void>('/users/me/connect-email/verify-otp', { email, otp });
  },
};

function searchSkill(name: string, type: 'offered' | 'wanted', userId: string, index: number): Skill {
  return {
    id: `${type}-${userId}-${index}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    name,
    icon: '',
    category: 'General',
    level: 'beginner',
    description: '',
  };
}

function searchResultToUser(person: UserSearchResult): User {
  return {
    id: person.id,
    name: person.displayName,
    username: person.username,
    email: '',
    avatar: person.avatar ?? '',
    university: person.university ?? '',
    bio: `${person.displayName} is active in the SkillEX marketplace.`,
    skillsOffered: (person.topSkillsOffered ?? []).map((name, index) => searchSkill(name, 'offered', person.id, index)),
    skillsWanted: (person.topSkillsWanted ?? []).map((name, index) => searchSkill(name, 'wanted', person.id, index)),
    skillexScore: person.reputationScore ?? 0,
    level: 'Member',
    sessionsCompleted: person.sessionsCompleted ?? 0,
    rating: Number(person.rating ?? 0),
    isOnline: person.isOnline ?? false,
    joinedAt: new Date().toISOString(),
  };
}
