import { api } from './api';

export interface GroupSessionAttendee {
  userId: string;
  name: string;
  avatar: string | null;
  joinedAt: string;
  certificateEarned: boolean;
}

export interface GroupSession {
  id: string;
  mentorId: string;
  mentorName: string;
  mentorAvatar: string | null;
  skillId: string;
  skillName: string;
  title: string;
  description: string | null;
  scheduledAt: string;
  durationMinutes: number;
  maxAttendees: number;
  attendees: GroupSessionAttendee[];
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  sharedNotes: string | null;
  createdAt: string;
}

export interface GroupCertificate {
  id: string;
  learnerUserId: string;
  learnerName: string;
  skillName: string;
  sessionId: string;
  mentorName: string;
  attendeeCount: number;
  issueDate: string;
  certificateUrl: string;
}

export interface CreateGroupSessionRequest {
  skillId: string;
  title: string;
  description: string;
  scheduledAt: string;
  durationMinutes: number;
  maxAttendees: number;
}

export interface GroupSessionDraftRequest {
  skillId: string;
  audienceLevel: string;
  goal: string;
}

export interface GroupSessionDraft {
  title: string;
  description: string;
  durationMinutes: number;
  maxAttendees: number;
  agenda: string;
  prerequisites: string;
  takeaways: string;
}

interface Paged<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export const groupSessionService = {
  /** POST /api/group-sessions - host a new workshop */
  create: (request: CreateGroupSessionRequest): Promise<GroupSession> =>
    api.post<GroupSession>('/group-sessions', request),

  /** POST /api/group-sessions/draft - AI workshop draft for a mentor skill */
  draft: (request: GroupSessionDraftRequest): Promise<GroupSessionDraft> =>
    api.post<GroupSessionDraft>('/group-sessions/draft', request),

  /** GET /api/group-sessions - upcoming sessions open for enrollment */
  listActive: (page = 0, size = 20): Promise<Paged<GroupSession>> =>
    api.get<Paged<GroupSession>>(`/group-sessions?page=${page}&size=${size}`),

  /** GET /api/group-sessions/user/my-sessions - sessions I host or attend */
  listMine: (page = 0, size = 20): Promise<Paged<GroupSession>> =>
    api.get<Paged<GroupSession>>(`/group-sessions/user/my-sessions?page=${page}&size=${size}`),

  /** GET /api/group-sessions/{id} */
  get: (sessionId: string): Promise<GroupSession> =>
    api.get<GroupSession>(`/group-sessions/${sessionId}`),

  /** POST /api/group-sessions/{id}/join */
  join: (sessionId: string): Promise<void> =>
    api.post<void>(`/group-sessions/${sessionId}/join`, null),

  /** POST /api/group-sessions/{id}/leave */
  leave: (sessionId: string): Promise<void> =>
    api.post<void>(`/group-sessions/${sessionId}/leave`, null),

  /** POST /api/group-sessions/{id}/complete - host only */
  complete: (sessionId: string, notes: string): Promise<void> =>
    api.post<void>(`/group-sessions/${sessionId}/complete`, { notes }),

  /** POST /api/group-sessions/{id}/cancel - host only */
  cancel: (sessionId: string): Promise<void> =>
    api.post<void>(`/group-sessions/${sessionId}/cancel`, null),

  /** POST /api/group-sessions/{id}/certificate - attendee claims certificate */
  claimCertificate: (sessionId: string): Promise<GroupCertificate> =>
    api.post<GroupCertificate>(`/group-sessions/${sessionId}/certificate`, null),
};
