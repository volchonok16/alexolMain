import { apiClient } from './client';

export interface User {
  id: string;
  login: string;
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

export const usersApi = {
  getAll: (page: number = 1, limit: number = 20) =>
    apiClient.get<{ data: UsersResponse }>(`/users?page=${page}&limit=${limit}`),
};
