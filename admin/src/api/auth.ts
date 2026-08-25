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

export const authApi = {
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>('/auth/login', data);
    return response.data;
  },
};
