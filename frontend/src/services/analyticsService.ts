import { api } from './api';

export interface SkillInsight {
  skillId: string;
  skillName: string;
  category: string;
  count: number;
}

export interface MentorInsight {
  userId: string;
  name: string;
  avatar?: string;
  university?: string;
  sessionsCompleted: number;
  rating: number;
  skillexScore: number;
  topSkills: string[];
}

export interface PlatformAnalytics {
  mostDemandedSkills: SkillInsight[];
  mostTaughtSkills: SkillInsight[];
  topMentors: MentorInsight[];
  totalUsers: number;
  totalSessions: number;
}

export const analyticsService = {
  platform: (limit = 5) => api.get<PlatformAnalytics>(`/analytics/platform?limit=${limit}`),
};
