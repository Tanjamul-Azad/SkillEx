import { api } from './api';
import type { Notification } from '@/types';
import { normalizeNotificationPayload } from '@/lib/realtime';

export interface PagedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export const NotificationService = {
  /** GET /api/notifications?page=0&size=20 */
  getAll: async (page = 0, size = 20): Promise<PagedResponse<Notification>> => {
    const response = await api.get<PagedResponse<unknown>>(`/notifications?page=${page}&size=${size}`);
    return {
      ...response,
      content: (response.content ?? [])
        .map((item) => normalizeNotificationPayload(item))
        .filter((item): item is Notification => Boolean(item)),
    };
  },

  /** PATCH /api/notifications/{id}/read */
  markRead: async (id: string): Promise<Notification> => {
    const updated = await api.patch<unknown>(`/notifications/${id}/read`, {});
    const normalized = normalizeNotificationPayload(updated);
    if (!normalized) {
      throw new Error('Invalid notification payload received from server.');
    }
    return normalized;
  },

  /** POST /api/notifications/read-all */
  markAllRead: (): Promise<void> =>
    api.post<void>('/notifications/read-all', {}),
};
