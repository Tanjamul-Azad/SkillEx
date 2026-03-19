import { Skill } from '@/types';
import { api } from './api';

export interface SkillIntentSuggestion {
  skillId?: string | null;
  skillName: string;
  category: string;
  confidence: number;
  custom?: boolean;
}

export interface SkillIntentInterpretResult {
  rawText: string;
  inferredLevel: 'Beginner' | 'Moderate' | 'Expert' | null;
  primary: SkillIntentSuggestion | null;
  alternatives: SkillIntentSuggestion[];
}

export interface SkillIntentInterpretResponse {
  teach: SkillIntentInterpretResult | null;
  learn: SkillIntentInterpretResult | null;
}

export const SkillService = {
  getAll: async () => {
    return api.get<Skill[]>('/skills');
  },

  getById: async (id: string) => {
    return api.get<Skill>(`/skills/${id}`);
  },

  interpretIntent: async (payload: { teachText?: string; learnText?: string }) => {
    return api.post<SkillIntentInterpretResponse>('/skills/interpret', payload);
  }
};
