import { api } from './api';

export interface AiHelperResponse {
  contextType: string;
  response: string;
  suggestedActions: string[];
  safetyNote: string;
}

export const aiHelperService = {
  ask: (data: { contextType: string; prompt: string; pagePath?: string; relatedEntityId?: string }) =>
    api.post<AiHelperResponse>('/ai/helper', data),
};
