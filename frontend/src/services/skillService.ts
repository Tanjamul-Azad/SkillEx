import { Skill } from '@/types';
import { api } from './api';

export const SkillService = {
  getAll: async () => {
    return api.get<Skill[]>('/skills');
  },

  getById: async (id: string) => {
    return api.get<Skill>(`/skills/${id}`);
  },

  // Mock implementation for creation as mockData.ts is read-only essentially
  create: async (data: Partial<Skill>) => {
    return api.post<Skill>('/skills', data);
  }
};
