import { api } from './api';
import type { Notification } from '@/types';

export interface PagedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export const NotificationService = {
  /** GET /api/notifications?page=0&size=20 */
  getAll: (page = 0, size = 20): Promise<PagedResponse<Notification>> =>
    api.get<PagedResponse<Notification>>(`/notifications?page=${page}&size=${size}`),

  /** PATCH /api/notifications/{id}/read */
  markRead: (id: string): Promise<Notification> =>
    api.patch<Notification>(`/notifications/${id}/read`, {}),

  /** POST /api/notifications/read-all */
  markAllRead: (): Promise<void> =>
    api.post<void>('/notifications/read-all', {}),
};
