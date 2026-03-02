import { User } from '@/types';
import { api } from './api';

export const UserService = {
  getAll: async (page = 1, limit = 10, search?: string) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (search) params.append('q', search);
    return api.get<{ data: User[]; total: number }>(`/users?${params.toString()}`);
  },

  getById: async (id: string) => {
    return api.get<User>(`/users/${id}`);
  },

  /** Update authenticated user's own profile (PATCH /api/users/:id) */
  updateProfile: async (id: string, data: Partial<Omit<User, 'id' | 'email'>>) => {
    return api.patch<User>(`/users/${id}`, data);
  },
};
