import { api } from './api';

export interface SkillTrust {
  userId: string;
  skillId: string;
  skillName: string;
  score: number;
  proofScore: number;
  sessionScore: number;
  reviewScore: number;
  skillCheckScore: number;
  safetyScore: number;
  adminVerified: boolean;
  proofUploaded: boolean;
  completedTeachingSessions: number;
  reviewCount: number;
  averageSkillRating: number;
  skillCheckSuitableCount: number;
  reasons: string[];
}

export const skillTrustService = {
  get: (userId: string, skillId: string): Promise<SkillTrust> =>
    api.get<SkillTrust>(`/users/${userId}/skills/${skillId}/trust`),
};
