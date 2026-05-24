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
  introDone: boolean;
  proofDemoDone: boolean;
  goalAlignmentDone: boolean;
  scheduleFitDone: boolean;
  createdAt: string;
}

export const skillCheckService = {
  create: (data: { targetUserId: string; skillId: string; message?: string }): Promise<SkillCheckMeeting> =>
    api.post<SkillCheckMeeting>('/skill-checks', data),
  feedback: (id: string, data: { outcome: 'SUITABLE' | 'MAYBE' | 'NOT_SUITABLE'; notes?: string }): Promise<SkillCheckMeeting> =>
    api.post<SkillCheckMeeting>(`/skill-checks/${id}/feedback`, data),
};
