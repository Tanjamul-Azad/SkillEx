import { api } from './api';
import type { Skill } from '@/types';

export interface ExchangeProfile {
  id: string;
  name: string;
  avatar: string | null;
  email: string;
  university: string | null;
  skills_offered: Skill[];
  skills_wanted: Skill[];
  skillex_score: number;
  rating: number;
  is_online: boolean;
}

export interface Exchange {
  id: string;
  requester_id: string;
  receiver_id: string;
  offered_skill: Skill | null;
  wanted_skill: Skill | null;
  message: string | null;
  status: 'pending' | 'accepted' | 'declined' | 'completed' | 'cancelled';
  session_date: string | null;
  created_at: string;
  updated_at: string;
  requester: ExchangeProfile;
  receiver: ExchangeProfile;
}

export interface PagedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
  last: boolean;
}

export const exchangeService = {
  list(status?: string, page = 0, size = 20): Promise<PagedResponse<Exchange>> {
    const params = new URLSearchParams({ page: String(page), size: String(size) });
    if (status) params.set('status', status);
    return api.get<PagedResponse<Exchange>>(`/exchanges?${params.toString()}`);
  },

  create(data: {
    receiverId: string;
    offeredSkillId?: string;
    wantedSkillId?: string;
    message?: string;
  }): Promise<Exchange> {
    return api.post<Exchange>('/exchanges', data);
  },

  /** PATCH /api/exchanges/{id}/status — accept / decline / complete */
  updateStatus(id: string, status: 'accepted' | 'declined' | 'completed' | 'cancelled'): Promise<Exchange> {
    return api.patch<Exchange>(`/exchanges/${id}/status`, { status });
  },

  cancel(id: string): Promise<void> {
    return api.delete<void>(`/exchanges/${id}`);
  },
};
