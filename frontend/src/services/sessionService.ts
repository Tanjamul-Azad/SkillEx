import type { Session } from '@/types';
import { api } from './api';

export interface PagedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export const SessionService = {
  /** GET /api/sessions?page=0&size=20 — sessions for the logged-in user */
  getAll: async (page = 0, size = 20): Promise<PagedResponse<Session>> => {
    return api.get<PagedResponse<Session>>(`/sessions?page=${page}&size=${size}`);
  },

  /** GET /api/sessions/{id} */
  getById: async (id: string): Promise<Session> => {
    return api.get<Session>(`/sessions/${id}`);
  },

  /** POST /api/sessions — schedule a new session */
  create: async (data: {
    exchangeId: string;
    scheduledAt: string;
    durationMins: number;
    meetLink?: string;
  }): Promise<Session> => {
    return api.post<Session>('/sessions', data);
  },

  /** PATCH /api/sessions/{id}/complete */
  complete: async (id: string): Promise<Session> => {
    return api.patch<Session>(`/sessions/${id}/complete`, {});
  },

  /** PATCH /api/sessions/{id}/cancel */
  cancel: async (id: string): Promise<Session> => {
    return api.patch<Session>(`/sessions/${id}/cancel`, {});
  },
};
