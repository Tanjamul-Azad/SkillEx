import { api } from './api';

export interface TutorMessageMetadata {
  isQuiz?: boolean;
  quizType?: 'multiple-choice' | 'short-answer' | 'true-false';
  quizOptions?: string[];
  correctAnswerIndex?: number;
  answered?: boolean;
  userAnswerIndex?: number;
  answerFeedback?: string;
  citedSessions?: string[];
  skillName?: string;
  suggestedFollowUps?: string[];
}

export interface TutorMessageDto {
  id: string;
  content: string;
  role: 'user' | 'tutor';
  createdAt: string;
  metadata?: TutorMessageMetadata;
}

export interface TutorConversationDto {
  id: string;
  skillId: string;
  skillName: string;
  userId: string;
  messages: TutorMessageDto[];
  totalQuestionsAsked: number;
  questionsAnsweredCorrectly: number;
  accuracyPercentage: number;
  lastInteractionAt: string;
  createdAt: string;
  active: boolean;
}

export const tutorBotService = {
  /**
   * Send a message to the tutor and get a response
   */
  sendMessage: (skillId: string, message: string) =>
    api.post<TutorMessageDto>(`/tutor/${skillId}/message`, { message }),

  /**
   * Get conversation history for a skill
   */
  getConversation: (skillId: string) =>
    api.get<TutorConversationDto>(`/tutor/${skillId}/history`),

  /**
   * Get all conversations for the user
   */
  getAllConversations: () =>
    api.get<TutorConversationDto[]>('/tutor/conversations/all'),

  /**
   * Delete a conversation
   */
  deleteConversation: (skillId: string) =>
    api.delete(`/tutor/${skillId}`),

  /**
   * Clear conversation messages
   */
  clearConversation: (skillId: string) =>
    api.post(`/tutor/${skillId}/clear`, {}),

  /**
   * Submit a quiz answer
   */
  submitQuizAnswer: (skillId: string, messageId: string, answerIndex?: number, answerText?: string) =>
    api.post<TutorMessageDto>(`/tutor/${skillId}/quiz-answer`, {
      messageId,
      answerIndex,
      answerText,
    }),
};
