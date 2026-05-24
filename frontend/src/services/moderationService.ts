import { api } from './api';
import type { PagedResponse } from './adminService';

export type ReportTargetType = 'USER' | 'POST' | 'COMMENT' | 'MESSAGE' | 'PROFILE' | 'SESSION' | 'REVIEW' | 'SKILL' | 'DISCUSSION';

export interface CreateReportRequest {
  targetType: ReportTargetType;
  targetId: string;
  targetUserId?: string;
  category: string;
  reason: string;
  evidence?: string;
}

export interface Report {
  id: string;
  reporterUserId: string;
  reporterName: string;
  targetType: ReportTargetType;
  targetId: string;
  targetUserId?: string;
  targetUserName?: string;
  category: string;
  reason: string;
  evidence?: string;
  status: string;
  createdAt: string;
}

export interface ModerationCase {
  id: string;
  reportId?: string;
  targetUserId?: string;
  targetUserName?: string;
  title: string;
  summary?: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: string;
  aiSummary?: string;
  aiRecommendedAction?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ModerationAction {
  id: string;
  caseId?: string;
  adminUserId: string;
  adminName: string;
  targetUserId?: string;
  targetUserName?: string;
  targetType?: string;
  targetId?: string;
  actionType: string;
  severity: string;
  reason: string;
  evidence?: string;
  durationHours?: number;
  createdAt: string;
}

export interface UserRestriction {
  id: string;
  userId: string;
  restrictionType: string;
  reason: string;
  status: string;
  startsAt: string;
  endsAt?: string;
}

export const moderationService = {
  report: (data: CreateReportRequest) => api.post<Report>('/moderation/reports', data),
  reports: (status?: string, page = 0, size = 20) => {
    const params = new URLSearchParams({ page: String(page), size: String(size) });
    if (status) params.set('status', status);
    return api.get<PagedResponse<Report>>(`/moderation/reports?${params}`);
  },
  cases: (status?: string, page = 0, size = 20) => {
    const params = new URLSearchParams({ page: String(page), size: String(size) });
    if (status) params.set('status', status);
    return api.get<PagedResponse<ModerationCase>>(`/moderation/cases?${params}`);
  },
  getCase: (caseId: string) => api.get<ModerationCase>(`/moderation/cases/${caseId}`),
  applyAction: (data: {
    caseId?: string;
    targetUserId?: string;
    targetType?: string;
    targetId?: string;
    actionType: string;
    severity?: string;
    reason: string;
    evidence?: string;
    durationHours?: number;
  }) => api.post<ModerationAction>('/moderation/actions', data),
  userActions: (userId: string, page = 0, size = 20) =>
    api.get<PagedResponse<ModerationAction>>(`/moderation/users/${userId}/actions?page=${page}&size=${size}`),
  myRestrictions: () => api.get<UserRestriction[]>('/users/me/restrictions'),
};
