import type { Session } from '@/types';
import { api } from './api';

export const SessionService = {
  /**
   * Get all sessions for a user.
   * Java counterpart: GET /api/users/{id}/sessions
   */
  getForUser: async (userId: string): Promise<Session[]> => {
    return api.get<Session[]>(`/users/${userId}/sessions`);
  },

  /**
   * Get a single session by ID.
   * Java counterpart: GET /api/sessions/{id}
   */
  getById: async (id: string): Promise<Session> => {
    return api.get<Session>(`/sessions/${id}`);
  },
};
