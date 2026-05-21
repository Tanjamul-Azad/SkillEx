import type { Session } from '@/types';
import { api } from './api';

export interface PagedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

const normalizeSession = (session: Session): Session => ({
  ...session,
  status: String(session.status).toLowerCase() as Session['status'],
  sessionType: session.sessionType
    ? (String(session.sessionType).toUpperCase() as Session['sessionType'])
    : undefined,
});

const normalizePagedSessions = (page: PagedResponse<Session>): PagedResponse<Session> => ({
  ...page,
  content: (page.content ?? []).map(normalizeSession),
});

export const SessionService = {
  /** GET /api/sessions?page=0&size=20 — sessions for the logged-in user */
  getAll: async (page = 0, size = 20): Promise<PagedResponse<Session>> => {
    const result = await api.get<PagedResponse<Session>>(`/sessions?page=${page}&size=${size}`);
    return normalizePagedSessions(result);
  },

  /** GET /api/sessions/{id} */
  getById: async (id: string): Promise<Session> => {
    const result = await api.get<Session>(`/sessions/${id}`);
    return normalizeSession(result);
  },

  /** POST /api/sessions — propose a new session */
  create: async (data: {
    exchangeId: string;
    teacherId?: string;
    learnerId?: string;
    skillId?: string;
    scheduledAt: string;
    durationMins: number;
    meetLink?: string;
    sessionType?: 'VIDEO' | 'AUDIO';
  }): Promise<Session> => {
    const result = await api.post<Session>('/sessions', data);
    return normalizeSession(result);
  },

  /** PUT /api/sessions/{id}/accept — accept a proposed session time */
  acceptProposal: async (id: string): Promise<Session> => {
    const result = await api.put<Session>(`/sessions/${id}/accept`, {});
    return normalizeSession(result);
  },

  /** PUT /api/sessions/{id}/reschedule — propose a different time */
  reschedule: async (id: string, data: {
    scheduledAt: string;
    durationMins: number;
  }): Promise<Session> => {
    const result = await api.put<Session>(`/sessions/${id}/reschedule`, data);
    return normalizeSession(result);
  },

  /** PATCH /api/sessions/{id}/complete */
  complete: async (id: string): Promise<Session> => {
    const result = await api.patch<Session>(`/sessions/${id}/complete`, {});
    return normalizeSession(result);
  },

  /** PATCH /api/sessions/{id}/cancel */
  cancel: async (id: string): Promise<Session> => {
    const result = await api.patch<Session>(`/sessions/${id}/cancel`, {});
    return normalizeSession(result);
  },

  /** PATCH /api/sessions/{id}/notes */
  updateNotes: async (id: string, notes: string): Promise<Session> => {
    const result = await api.patch<Session>(`/sessions/${id}/notes`, { notes });
    return normalizeSession(result);
  },

  /** POST /api/sessions/{id}/join — retrieve Agora access token and transition status */
  joinRoom: async (sessionId: string): Promise<{ token: string; uid: number; channelName: string }> => {
    return api.post(`/sessions/${sessionId}/join`, {});
  },

  /** Legacy alias for backward compatibility with StudyRoomPage.tsx */
  joinSession: async (id: string): Promise<void> => {
    return api.post(`/sessions/${id}/join`, {});
  },

  /** POST /api/sessions/{id}/end — complete the call */
  endRoom: async (sessionId: string): Promise<{ id: string; status: string; endedAt: string }> => {
    return api.post(`/sessions/${sessionId}/end`, {});
  },

  /** POST /api/sessions/{id}/transcribe — send speech chunk */
  transcribeAudio: async (sessionId: string, audioBlob: Blob): Promise<void> => {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'chunk.webm');
    return api.post(`/sessions/${sessionId}/transcribe`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  /** POST /api/sessions/{id}/transcribe/text — send pre-transcribed text directly */
  transcribeText: async (sessionId: string, text: string): Promise<void> => {
    return api.post(`/sessions/${sessionId}/transcribe/text`, { text });
  },

  /** POST /api/sessions/{id}/notes/generate — request background AI summary */
  triggerNotes: async (sessionId: string): Promise<void> => {
    return api.post(`/sessions/${sessionId}/notes/generate`, {});
  },

  /** GET /api/sessions/{id}/notes — retrieve generated summaries */
  getNotes: async (sessionId: string): Promise<{
    sessionId: string;
    keyConcepts: string;
    actionItems: string;
    resourcesMentioned: string;
    summary: string;
    generatedAt: string;
  }> => {
    return api.get(`/sessions/${sessionId}/notes`);
  },

  /** GET /api/sessions/{id}/transcript — retrieve full conversation log */
  getTranscript: async (sessionId: string): Promise<Array<{
    id: number;
    speakerUserId: string;
    speakerRole: string;
    content: string;
    spokenAt: string;
  }>> => {
    return api.get(`/sessions/${sessionId}/transcript`);
  },

  /** DELETE /api/sessions/{id} — post-review cleanup (delete session, transcripts, notes) */
  deleteSession: async (sessionId: string): Promise<void> => {
    return api.delete(`/sessions/${sessionId}`);
  },
};
