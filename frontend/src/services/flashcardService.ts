import { api } from './api';

export interface Flashcard {
  id: string;
  term: string;
  definition: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
}

export interface QuizQuestion {
  id: string;
  question: string;
  choices: string[];
  correctAnswerIndex: number;
  explanation: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
}

export interface ActionItem {
  id: string;
  description: string;
  owner: string;
  dueDate: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface StudyMaterial {
  sessionId: string;
  skillName: string;
  flashcards: Flashcard[];
  quizQuestions: QuizQuestion[];
  actionItems: ActionItem[];
  generatedAt: string;
}

export const FlashcardService = {
  /**
   * GET /api/sessions/{sessionId}/study-materials
   * Generates and retrieves study materials for a session
   */
  getStudyMaterials: async (sessionId: string): Promise<StudyMaterial> => {
    const result = await api.get<StudyMaterial>(
      `/sessions/${sessionId}/study-materials`
    );
    return result;
  },
};
