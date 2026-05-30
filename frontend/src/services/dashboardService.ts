import { api } from './api';

export interface ActivityItem {
  type: string;
  message: string;
  createdAt: string;
}

export interface DashboardStats {
  sessionsCompleted: number;
  skillexScore: number;
  rating: number;
  pendingExchanges: number;
  activeExchanges: number;
  pendingConnections: number;
  recentActivity: ActivityItem[];
}

export interface SmartAction {
  id: string;
  type: 'PROFILE' | 'EXCHANGE' | 'SESSION' | 'MATCH' | string;
  title: string;
  reason: string;
  priority: number;
  actionLabel: string;
  route: string;
  relatedEntityId?: string | null;
}

export const DashboardService = {
  /** GET /api/dashboard/stats — aggregated stats for the authenticated user */
  getStats: (): Promise<DashboardStats> =>
    api.get<DashboardStats>('/dashboard/stats'),
  getSmartActions: (): Promise<SmartAction[]> =>
    api.get<SmartAction[]>('/dashboard/smart-actions'),
};
