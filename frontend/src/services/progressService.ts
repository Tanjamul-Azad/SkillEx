import type { PortfolioProof, PortfolioProofType, UserProgress, XpEvent } from '@/types';
import { api } from './api';
import type { PagedResponse } from './communityService';

export interface CreatePortfolioProofRequest {
  skillId?: string;
  title: string;
  description?: string;
  proofType: PortfolioProofType | string;
  url?: string;
  mediaUrl?: string;
  sourceSessionId?: string;
  visibility?: 'PUBLIC' | 'PRIVATE';
  featured?: boolean;
}

export const progressService = {
  myProgress: (): Promise<UserProgress> => api.get<UserProgress>('/progress/me'),
  userProgress: (userId: string): Promise<UserProgress> =>
    api.get<UserProgress>(`/users/${userId}/progress`),
  myXpEvents: (page = 0, size = 10): Promise<PagedResponse<XpEvent>> =>
    api.get<PagedResponse<XpEvent>>(`/progress/me/xp-events?page=${page}&size=${size}`),
  userPortfolio: (userId: string, page = 0, size = 20): Promise<PagedResponse<PortfolioProof>> =>
    api.get<PagedResponse<PortfolioProof>>(`/users/${userId}/portfolio-proofs?page=${page}&size=${size}`),
  createPortfolioProof: (request: CreatePortfolioProofRequest): Promise<PortfolioProof> =>
    api.post<PortfolioProof>('/users/me/portfolio-proofs', request),
  deletePortfolioProof: (proofId: string): Promise<string> =>
    api.delete<string>(`/users/me/portfolio-proofs/${proofId}`),
};
