import { SkillChain, SkillMatch } from '@/types';
import { api } from './api';

export const MatchService = {
  getMatchesForUser: async (userId: string) => {
    return api.get<SkillMatch[]>(`/users/${userId}/matches`);
  },

  getChainsForUser: async (userId: string) => {
    return api.get<SkillChain[]>(`/users/${userId}/chains`);
  }
};
