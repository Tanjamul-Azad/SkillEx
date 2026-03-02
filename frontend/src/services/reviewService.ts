import type { Review } from '@/types';
import { api } from './api';

export const ReviewService = {
  /**
   * Get all reviews received by a user.
   * Java counterpart: GET /api/users/{id}/reviews
   */
  getForUser: async (userId: string): Promise<Review[]> => {
    return api.get<Review[]>(`/users/${userId}/reviews`);
  },
};
