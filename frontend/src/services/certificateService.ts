import { api } from './api';

export interface SkillCertificate {
  id: string;
  userId: string;
  userName: string;
  skillId: string;
  skillName: string;
  certificateType: string;
  title: string;
  levelLabel: string;
  trustScoreSnapshot: number;
  sessionCountSnapshot: number;
  averageRatingSnapshot: number;
  verificationCode: string;
  status: 'ACTIVE' | 'REVOKED' | string;
  revokedReason?: string | null;
  issuedAt: string;
  revokedAt?: string | null;
  verificationUrl: string;
  githubBadgeMarkdown: string;
}

export interface UserBadge {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  skillId?: string | null;
  skillName?: string | null;
  status: 'ACTIVE' | 'REVOKED' | string;
  awardedAt: string;
}

export const certificateService = {
  myCertificates: (): Promise<SkillCertificate[]> => api.get<SkillCertificate[]>('/certificates/me'),
  userCertificates: (userId: string): Promise<SkillCertificate[]> =>
    api.get<SkillCertificate[]>(`/users/${userId}/certificates`),
  myBadges: (): Promise<UserBadge[]> => api.get<UserBadge[]>('/badges/me'),
  userBadges: (userId: string): Promise<UserBadge[]> => api.get<UserBadge[]>(`/users/${userId}/badges`),
  publicCertificate: (code: string): Promise<SkillCertificate> =>
    api.get<SkillCertificate>(`/public/certificates/${code}`),
};
