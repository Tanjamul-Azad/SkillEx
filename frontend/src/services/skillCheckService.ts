import { api } from './api';

export interface SkillCheckMeeting {
  id: string;
  requester: { id: string; name: string; avatar?: string | null };
  targetUser: { id: string; name: string; avatar?: string | null };
  skill: { id: string; name: string; icon?: string | null; category?: string | null };
  status: string;
  message?: string | null;
  requesterOutcome?: string | null;
  targetOutcome?: string | null;
  checklistIntro: boolean;
  checklistDemo: boolean;
  checklistGoalAlignment: boolean;
  checklistScheduleFit: boolean;
  scheduledAt?: string | null;
  createdAt: string;
}

interface PagedResponse<T> {
  content: T[];
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export const skillCheckService = {
  list: (page = 0, size = 10): Promise<PagedResponse<SkillCheckMeeting>> =>
    api.get<PagedResponse<SkillCheckMeeting>>(`/skill-checks?page=${page}&size=${size}`),
  create: (data: { targetUserId: string; skillId: string; message?: string }): Promise<SkillCheckMeeting> =>
    api.post<SkillCheckMeeting>('/skill-checks', data),
  feedback: (id: string, data: { outcome: 'SUITABLE' | 'MAYBE' | 'NOT_SUITABLE'; comment?: string }): Promise<SkillCheckMeeting> =>
    api.post<SkillCheckMeeting>(`/skill-checks/${id}/feedback`, data),
};
