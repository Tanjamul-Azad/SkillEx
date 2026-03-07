import type { Review } from '@/types';
import { api } from './api';

export interface PagedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export const ReviewService = {
  /** GET /api/reviews?userId=&page=0&size=20 — reviews received by a user */
  getForUser: async (userId: string, page = 0, size = 20): Promise<PagedResponse<Review>> => {
    return api.get<PagedResponse<Review>>(`/reviews?userId=${userId}&page=${page}&size=${size}`);
  },

  /** POST /api/reviews — submit a review */
  create: async (data: {
    revieweeId: string;
    exchangeId: string;
    rating: number;
    comment?: string;
  }): Promise<Review> => {
    return api.post<Review>('/reviews', data);
  },
};
