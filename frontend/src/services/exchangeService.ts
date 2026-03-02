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

export const exchangeService = {
  list(status?: string): Promise<{ data: Exchange[] }> {
    const params = status ? `?status=${status}` : '';
    return api.get<{ data: Exchange[] }>(`/exchanges${params}`);
  },

  create(data: {
    receiverId: string;
    offeredSkill?: Skill;
    wantedSkill?: Skill;
    message?: string;
  }): Promise<{ data: Exchange }> {
    return api.post<{ data: Exchange }>('/exchanges', data);
  },

  update(id: string, data: {
    status?: 'accepted' | 'declined' | 'completed' | 'cancelled';
    sessionDate?: string;
    message?: string;
  }): Promise<{ data: Exchange }> {
    return api.patch<{ data: Exchange }>(`/exchanges/${id}`, data);
  },

  cancel(id: string): Promise<void> {
    return api.delete<void>(`/exchanges/${id}`);
  },
};
