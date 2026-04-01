import { api } from './api';

export interface ConnectionUser {
  id: string;
  name: string;
  username?: string;
  avatar: string | null;
  university: string | null;
  level: string;
  skillexScore: number;
  rating: number;
  isOnline: boolean;
}

export interface Connection {
  id: string;
  requester: ConnectionUser;
  receiver: ConnectionUser;
  message: string | null;
  status: string;
  respondedAt: string | null;
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

export type ConnectionRelationshipStatus =
  | 'NONE'
  | 'PENDING_SENT'
  | 'PENDING_RECEIVED'
  | 'CONNECTED';

export interface ConnectionRelationship {
  targetUserId: string;
  status: ConnectionRelationshipStatus;
  connectionId: string | null;
  canMessage: boolean;
}

export const connectionService = {
  list(status?: string, direction: 'all' | 'sent' | 'received' = 'all', page = 0, size = 20): Promise<PagedResponse<Connection>> {
    const params = new URLSearchParams({
      page: String(page),
      size: String(size),
      direction,
    });
    if (status) params.set('status', status.toUpperCase());
    return api.get<PagedResponse<Connection>>(`/connections?${params.toString()}`);
  },

  create(data: { receiverId: string; message?: string }): Promise<Connection> {
    return api.post<Connection>('/connections', data);
  },

  updateStatus(id: string, status: 'accepted' | 'declined' | 'cancelled'): Promise<Connection> {
    return api.patch<Connection>(`/connections/${id}/status`, { status: status.toUpperCase() });
  },

  getRelationship(targetUserId: string): Promise<ConnectionRelationship> {
    return api.get<ConnectionRelationship>(`/connections/relationship/${targetUserId}`);
  },

  getPendingCount(): Promise<number> {
    return api.get<number>('/connections/pending-count');
  },
};
