import type { Feedback } from '@/types';
import { api } from './api';

export const FeedbackService = {
  /** GET /api/feedbacks — retrieve all global user feedbacks */
  getAll: async (): Promise<Feedback[]> => {
    return api.get<Feedback[]>('/feedbacks');
  },

  /** POST /api/feedbacks — submit new feedback (requires authentication) */
  create: async (data: {
    rating: number;
    comment: string;
  }): Promise<Feedback> => {
    return api.post<Feedback>('/feedbacks', data);
  },
};
