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

export interface ChainActivationHop {
  fromUserId: string;
  toUserId: string;
  skillId: string;
}

export interface ChainActivationResult {
  exchangesCreated: number;
  alreadyPending: number;
  exchangeIds: string[];
  summary: string;
}

export type ChainHopState = 'NONE' | 'PENDING' | 'ACCEPTED' | 'COMPLETED' | 'DECLINED' | 'CANCELLED';

export interface ChainStatusHop {
  fromUserId: string;
  toUserId: string;
  status: ChainHopState;
  exchangeId: string | null;
}

export interface ChainStatusResult {
  started: boolean;
  totalHops: number;
  pending: number;
  accepted: number;
  completed: number;
  declined: number;
  progress: number;
  hops: ChainStatusHop[];
}

export const MatchService = {
  /** GET /api/match/users?limit=20 — ranked compatible users for the current user */
  findMatches: (limit = 20): Promise<MatchUserDto[]> =>
    api.get<MatchUserDto[]>(`/match/users?limit=${limit}`),

  /** POST /api/match/chains/activate — start a multi-party skill chain */
  activateChain: (hops: ChainActivationHop[], message?: string): Promise<ChainActivationResult> =>
    api.post<ChainActivationResult>('/match/chains/activate', { hops, message }),

  /** POST /api/match/chains/status — get live status of hops in a chain */
  getChainStatus: (hops: ChainActivationHop[]): Promise<ChainStatusResult> =>
    api.post<ChainStatusResult>('/match/chains/status', { hops }),
};
