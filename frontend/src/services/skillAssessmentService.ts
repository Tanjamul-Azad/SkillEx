import { api } from './api';

export interface QuizQuestion {
  questionId: string;
  question: string;
  type: 'multiple_choice' | 'free_text' | 'fill_blank';
  options?: string[];
  correctAnswer?: string;
}

export interface SkillAssessment {
  assessmentId: string;
  skillId: string;
  skillName: string;
  difficulty: string;
  questions: QuizQuestion[];
  timeAllowedMinutes: number;
}

export interface GradedAssessment {
  assessmentId: string;
  skillId: string;
  skillName: string;
  score: number;
  questionsCorrect: number;
  questionsTotal: number;
  proficiencyLevel: 'novice' | 'intermediate' | 'proficient' | 'expert';
  feedback: string;
  completedAt: string;
  passedThreshold: boolean;
}

export const skillAssessmentService = {
  generate: (skillId: string, difficulty: string = 'intermediate'): Promise<SkillAssessment> =>
    api.post<SkillAssessment>(
      `/ai/assessments/generate?skillId=${encodeURIComponent(skillId)}&difficulty=${encodeURIComponent(difficulty)}`,
      null
    ),

  submit: (assessmentId: string, answers: Record<string, string>): Promise<GradedAssessment> =>
    api.post<GradedAssessment>(`/ai/assessments/${assessmentId}/submit`, answers),

  getLatestResult: (skillId: string): Promise<GradedAssessment | null> =>
    api.get<GradedAssessment | null>(`/ai/assessments/latest/${skillId}`),
};
