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
  recentActivity: ActivityItem[];
}

export const DashboardService = {
  /** GET /api/dashboard/stats — aggregated stats for the authenticated user */
  getStats: (): Promise<DashboardStats> =>
    api.get<DashboardStats>('/dashboard/stats'),
};
