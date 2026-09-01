import { apiClient } from './client';

export const QA_REQUEST_TIMEOUT_MS = 200_000;

export type QaMode = 'ai' | 'human';

export interface QaSettings {
  id: string;
  prompt: string;
  maxChars: number;
  updatedAt: string;
}

export interface QaMessage {
  id: string;
  role: 'user' | 'assistant' | string;
  author: 'user' | 'ai' | 'admin' | string;
  content: string;
  createdAt: string;
}

export interface QaConversation {
  id: string;
  sessionId: string;
  source: string;
  mode: QaMode | string;
  lastPreview: string;
  unread: boolean;
  createdAt: string;
  updatedAt: string;
  waitingOperator?: boolean;
  messages: QaMessage[];
}

export interface QaConversationListItem {
  id: string;
  sessionId: string;
  source: string;
  mode: QaMode | string;
  lastPreview: string;
  unread: boolean;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface QaConversationsResponse {
  data: QaConversationListItem[];
  total: number;
  page: number;
  limit: number;
}

export const qaApi = {
  getSettings: async (): Promise<QaSettings> => {
    const response = await apiClient.get<{ data: QaSettings }>('/qa/settings');
    return response.data.data;
  },

  saveSettings: async (payload: { prompt: string; maxChars: number }): Promise<QaSettings> => {
    const response = await apiClient.put<{ data: QaSettings }>('/qa/settings', payload);
    return response.data.data;
  },

  listConversations: async (page = 1, limit = 20): Promise<QaConversationsResponse> => {
    const response = await apiClient.get<QaConversationsResponse>('/qa/conversations', {
      params: { page, limit },
    });
    return response.data;
  },

  getConversation: async (id: string): Promise<QaConversation> => {
    const response = await apiClient.get<{ data: QaConversation }>(`/qa/conversations/${id}`);
    return response.data.data;
  },

  setMode: async (id: string, mode: QaMode): Promise<QaConversation> => {
    const response = await apiClient.patch<{ data: QaConversation }>(
      `/qa/conversations/${id}/mode`,
      { mode },
      { timeout: QA_REQUEST_TIMEOUT_MS }
    );
    return response.data.data;
  },

  reply: async (id: string, content: string): Promise<QaConversation> => {
    const response = await apiClient.post<{ data: QaConversation }>(
      `/qa/conversations/${id}/reply`,
      { content },
      { timeout: QA_REQUEST_TIMEOUT_MS }
    );
    return response.data.data;
  },

  testChat: async (payload: { sessionId?: string; message: string }): Promise<QaConversation> => {
    const response = await apiClient.post<{ data: QaConversation }>(
      '/qa/admin/chat',
      payload,
      { timeout: QA_REQUEST_TIMEOUT_MS }
    );
    return response.data.data;
  },

  getSession: async (sessionId: string): Promise<QaConversation> => {
    const response = await apiClient.get<{ data: QaConversation }>(`/qa/session/${sessionId}`, {
      timeout: QA_REQUEST_TIMEOUT_MS,
    });
    return response.data.data;
  },
};
