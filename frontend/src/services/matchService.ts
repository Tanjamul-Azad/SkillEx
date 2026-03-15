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
  sessionsCompleted: number;
  compatibilityScore: number;
  semanticSimilarity: number;
  strategyUsed: string;
  teachesYou: string[];
  wantsToLearnFromYou: string[];
  matchReasons: string[];
}

export const MatchService = {
  /** GET /api/match/users?limit=20 — ranked compatible users for the current user */
  findMatches: (limit = 20): Promise<MatchUserDto[]> =>
    api.get<MatchUserDto[]>(`/match/users?limit=${limit}`),
};
