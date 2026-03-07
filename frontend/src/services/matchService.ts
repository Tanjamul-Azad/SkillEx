import { api } from './api';

export interface MatchUserDto {
  id: string;
  name: string;
  avatar: string | null;
  university: string | null;
  level: string;
  skillexScore: number;
  rating: number;
  isOnline: boolean;
  compatibilityScore: number;
  teachesYou: string | null;
  wantsToLearnFromYou: string | null;
}

export const MatchService = {
  /** GET /api/match/users?limit=20 — ranked compatible users for the current user */
  findMatches: async (limit = 20): Promise<MatchUserDto[]> => {
    const res = await api.get<{ data: MatchUserDto[] }>(`/match/users?limit=${limit}`);
    return (res as unknown as { data: MatchUserDto[] }).data ?? (res as unknown as MatchUserDto[]);
  },
};
