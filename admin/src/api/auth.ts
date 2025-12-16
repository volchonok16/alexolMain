import { apiClient } from './client';

interface LoginRequest {
  login: string;
  password: string;
}

interface LoginResponse {
  token: string;
}

export const authApi = {
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>('/auth/login', data);
    return response.data;
  },
};
