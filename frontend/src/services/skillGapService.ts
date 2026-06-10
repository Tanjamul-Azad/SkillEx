import { api } from './api';

export interface PathStep {
  order: number;
  skillName: string;
  skillId: string;
  rationale: string;
  estimatedHours: number;
  availableMentors: MentorMatch[];
}

export interface MentorMatch {
  mentorId: string;
  mentorName: string;
  mentorAvatar?: string;
  trustScore: number;
  sessionsCompleted: number;
  avgRating: number;
  matchReason: string;
}

export interface LearningPath {
  steps: PathStep[];
  estimatedHours: number;
  reasoning: string;
}

export interface SkillGap {
  skillId: string;
  skillName: string;
  category: string;
  similarityToGoal: number;
  whyMissing: string;
  availableMentorNames: string[];
  mentorCount: number;
}

export interface SkillGapAnalysis {
  goalSkillId: string;
  goalSkillName: string;
  currentSkills: string[];
  gaps: SkillGap[];
  recommendedPath: LearningPath;
  summary: string;
}

export const skillGapService = {
  analyze: (goalSkillId: string): Promise<SkillGapAnalysis> =>
    api.get<SkillGapAnalysis>(`/ai/skill-gap/${goalSkillId}`),
};
