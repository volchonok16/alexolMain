import { apiClient } from './client';

export interface User {
  id: string;
  login: string;
  name: string;
  role: 'admin' | 'user';
  photo?: string | null;
  birthDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UsersResponse {
  users: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface UserPayload {
  login: string;
  password?: string;
  name: string;
  role: 'admin' | 'user';
  birthDate: string;
  photo?: File;
}

export const usersApi = {
  getMe: async (): Promise<User> => {
    const response = await apiClient.get<{ data: User }>('/users/me');
    return response.data.data;
  },

  getAll: async (page: number = 1, limit: number = 20): Promise<UsersResponse> => {
    const response = await apiClient.get<{ data: UsersResponse }>('/users', {
      params: { page, limit },
    });
    return response.data.data;
  },

  create: async (data: UserPayload): Promise<User> => {
    const formData = new FormData();
    formData.append('login', data.login);
    formData.append('password', data.password || '');
    formData.append('name', data.name);
    formData.append('role', data.role);
    formData.append('birthDate', data.birthDate);
    if (data.photo) formData.append('photo', data.photo);

    const response = await apiClient.post<{ data: User }>('/users', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data;
  },

  update: async (id: string, data: UserPayload): Promise<User> => {
    const formData = new FormData();
    formData.append('login', data.login);
    formData.append('name', data.name);
    formData.append('role', data.role);
    formData.append('birthDate', data.birthDate);
    if (data.password) formData.append('password', data.password);
    if (data.photo) formData.append('photo', data.photo);

    const response = await apiClient.put<{ data: User }>(`/users/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/users/${id}`);
  },
};
