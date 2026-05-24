import { api } from './api';

export interface MatchExplanation {
  targetUserId: string;
  finalScore: number;
  directSkillFit: number;
  semanticFit: number;
  intentFit: number;
  reputationFit: number;
  activityFit: number;
  safetyFit: number;
  fairnessBoost: number;
  riskPenalty: number;
  teacherCapabilityScore: number;
  skillTrustScore: number;
  recommendedMode: 'DIRECT_SWAP' | 'CREDIT_PAYMENT' | 'CHAIN_SWAP' | 'TEST_MEETING' | string;
  creditCost: number;
  testMeetingRecommended: boolean;
  whyLearnFromThisUser: string;
  reasons: string[];
  suggestedOpeningMessage: string;
}

export const matchExplanationService = {
  explain: (targetUserId: string) => api.get<MatchExplanation>(`/match/explain/${targetUserId}`),
};
