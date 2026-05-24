import { api } from './api';

export interface PagedResponse<T> {
  content: T[];
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export interface AdminOverview {
  totalUsers: number;
  totalSessions: number;
  totalReports: number;
  openReports: number;
  openCases: number;
  activeRestrictions: number;
  pendingSkills: number;
  activeRules: number;
}

export interface PlatformRule {
  id: string;
  code: string;
  title: string;
  description?: string;
  category: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  defaultAction: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminAuditLog {
  id: string;
  adminUserId: string;
  adminName: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: string;
  createdAt: string;
}

export interface PendingSkill {
  id: string;
  displayName: string;
  normalizedName: string;
  category?: string;
  description?: string;
  sourceIntent?: string;
  status: string;
  seenCount: number;
  requestedByUserId?: string;
  reviewNote?: string;
  lastSeenAt?: string;
}

export const adminService = {
  overview: () => api.get<AdminOverview>('/admin/overview'),
  auditLogs: (page = 0, size = 20) => api.get<PagedResponse<AdminAuditLog>>(`/admin/audit-logs?page=${page}&size=${size}`),
  rules: () => api.get<PlatformRule[]>('/admin/rules'),
  createRule: (data: Partial<PlatformRule>) => api.post<PlatformRule>('/admin/rules', data),
  updateRule: (id: string, data: Partial<PlatformRule>) => api.put<PlatformRule>(`/admin/rules/${id}`, data),
  pendingSkills: (status = 'PENDING') => api.get<PendingSkill[]>(`/skills/pending?status=${status}`),
  approveSkill: (pendingId: string, data: { skillName?: string; category?: string; description?: string; reviewNote?: string } = {}) =>
    api.post(`/skills/pending/${pendingId}/approve`, data),
  rejectSkill: (pendingId: string, reviewNote?: string) =>
    api.post(`/skills/pending/${pendingId}/reject`, { reviewNote }),
};
