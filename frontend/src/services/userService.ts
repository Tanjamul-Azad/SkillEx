import { User } from '@/types';
import { api } from './api';

export const UserService = {
  /** GET /api/users?query=&page=0&size=20  (page is 0-based on backend) */
  getAll: async (page = 1, size = 10, search?: string) => {
    const params = new URLSearchParams({
      page: (page - 1).toString(), // frontend is 1-based, backend is 0-based
      size: size.toString(),
    });
    if (search) params.append('query', search);
    return api.get<{ content: User[]; totalElements: number }>(`/users?${params.toString()}`);
  },

  getById: async (id: string) => {
    return api.get<User>(`/users/${id}`);
  },

  /** Update authenticated user's own profile (PATCH /api/users/me) */
  updateProfile: async (_id: string, data: Partial<Omit<User, 'id' | 'email'>>) => {
    return api.patch<User>('/users/me', data);
  },

  /** POST /api/users/me/skills — add an existing catalog skill */
  addSkill: async (skillId: string, type: 'offered' | 'wanted', level = 'BEGINNER'): Promise<void> => {
    return api.post<void>('/users/me/skills', { skillId, type, level: level.toUpperCase() });
  },

  /** POST /api/users/me/skills — add a custom (non-catalog) skill by name */
  addCustomSkill: async (skillName: string, skillCategory: string, type: 'offered' | 'wanted', level = 'BEGINNER'): Promise<void> => {
    return api.post<void>('/users/me/skills', { skillName, skillCategory, type, level: level.toUpperCase() });
  },

  /** DELETE /api/users/me/skills/{skillId}?type=offered|wanted */
  removeSkill: async (skillId: string, type: 'offered' | 'wanted'): Promise<void> => {
    return api.delete<void>(`/users/me/skills/${skillId}?type=${type}`);
  },

  /** DELETE /api/users/me — permanently delete authenticated user's account */
  deleteAccount: async (): Promise<void> => {
    return api.delete<void>('/users/me');
  },
};
