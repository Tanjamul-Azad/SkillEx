import { api } from './api';
import type { User } from '@/types';

export interface ResumeSkillSuggestion {
  name: string;
  category: string;
  level: 'BEGINNER' | 'MODERATE' | 'EXPERT' | string;
  evidence: string;
  confidence: number;
}

export interface ResumeProfileSignal {
  label: string;
  value: string;
}

export interface ResumeProfile {
  id: string;
  userId: string;
  resumeUrl?: string | null;
  sourceFilename?: string | null;
  contentType?: string | null;
  extractionMethod: string;
  status: string;
  headline?: string | null;
  educationSummary?: string | null;
  experienceSummary?: string | null;
  projectSummary?: string | null;
  certificationSummary?: string | null;
  toolsSummary?: string | null;
  languageSummary?: string | null;
  careerGoal?: string | null;
  teachSummary?: string | null;
  learnSummary?: string | null;
  suggestedOfferedSkills: ResumeSkillSuggestion[];
  suggestedWantedSkills: ResumeSkillSuggestion[];
  profileSignals: ResumeProfileSignal[];
  confidence: number;
  rawTextPreview?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface ApplyResumeProfileRequest {
  applyBio: boolean;
  applyTeachIntent: boolean;
  applyLearnIntent: boolean;
  offeredSkills: Array<{
    name: string;
    category: string;
    level: string;
    evidence: string;
  }>;
  wantedSkills: Array<{
    name: string;
    category: string;
    level: string;
    evidence: string;
  }>;
}

export const resumeProfileService = {
  getLatest: (): Promise<ResumeProfile | null> => api.get<ResumeProfile | null>('/users/me/resume-profile'),

  analyze: (file: File): Promise<ResumeProfile> => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<ResumeProfile>('/users/me/resume-profile/analyze', formData);
  },

  apply: (request: ApplyResumeProfileRequest): Promise<User> =>
    api.post<User>('/users/me/resume-profile/apply', request),
};
