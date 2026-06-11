import { api } from './api';

export interface PathStepWithMentor {
  order: number;
  skillId: string;
  skillName: string;
  description: string;
  estimatedHours: number;
  mentorId: string;
  mentorName: string;
  mentorAvatar?: string;
  scheduledSessionAt?: string;
  completed: boolean;
}

export interface LearningPath {
  id: string;
  userId: string;
  goalSkillId: string;
  goalSkillName: string;
  targetLevel: string;
  steps: PathStepWithMentor[];
  totalEstimatedHours: number;
  progressPercent: number;
  createdAt: string;
  estimatedCompletionAt?: string;
  status: string;
}

export const learningPathService = {
  generate: (goalSkillId: string, targetLevel: string = 'intermediate'): Promise<LearningPath> =>
    api.post<LearningPath>(
      `/ai/learning-paths?goalSkillId=${encodeURIComponent(goalSkillId)}&targetLevel=${encodeURIComponent(targetLevel)}`,
      null
    ),

  list: (): Promise<LearningPath[]> =>
    api.get<LearningPath[]>('/ai/learning-paths'),

  completeStep: (pathId: string, stepOrder: number): Promise<void> =>
    api.post<void>(`/ai/learning-paths/${pathId}/steps/${stepOrder}/complete`, null),

  cancel: (pathId: string): Promise<void> =>
    api.delete<void>(`/ai/learning-paths/${pathId}`),
};
