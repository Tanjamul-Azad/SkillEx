import { api } from './api';

/** Matches backend UserSummaryDto */
export interface ExchangeUser {
  id: string;
  name: string;
  avatar: string | null;
  university: string | null;
  level: string;
  skillexScore: number;
  rating: number;
  isOnline: boolean;
}

/** Matches backend ExchangeDto.SkillRef */
export interface ExchangeSkillRef {
  id: string;
  name: string;
  icon: string;
  category: string;
}

/** Matches backend ExchangeDto — all camelCase */
export interface Exchange {
  id: string;
  requester: ExchangeUser;
  receiver: ExchangeUser;
  offeredSkill: ExchangeSkillRef | null;
  wantedSkill: ExchangeSkillRef | null;
  message: string | null;
  /** Uppercase from backend: PENDING | ACCEPTED | DECLINED | COMPLETED | CANCELLED */
  status: string;
  sessionDate: string | null;
  createdAt: string;
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
