import { apiClient } from './client';

export interface AuthUser {
  id: string;
  login: string;
  name: string;
  role: 'admin' | 'user' | string;
  photo?: string | null;
}

interface LoginRequest {
  login: string;
  password: string;
}

interface LoginResponse {
  token: string;
  user: AuthUser;
}

export const MAIL_APP_URL = (import.meta.env.VITE_MAIL_URL as string | undefined)?.replace(/\/$/, '')
  || 'https://mail.alexol.io';

export const authApi = {
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>('/auth/login', data);
    return response.data;
  },

  createMailTicket: async (): Promise<{ ticket: string; expiresIn: number }> => {
    const response = await apiClient.post<{ ticket: string; expiresIn: number }>('/auth/sso/mail-ticket');
    return response.data;
  },

  exchangeSso: async (ticket: string): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>('/auth/sso/exchange', { ticket });
    return response.data;
  },
};

export async function openMailApp(): Promise<void> {
  const { ticket } = await authApi.createMailTicket();
  window.location.href = `${MAIL_APP_URL}/sso?ticket=${encodeURIComponent(ticket)}`;
}
