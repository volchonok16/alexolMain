import { apiClient } from './client';
import type { OrgRoleId } from '@/utils/orgRoles';

export interface User {
  id: string;
  login: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  jobTitle?: string | null;
  telegram?: string | null;
  role: 'admin' | 'user';
  photo?: string | null;
  birthDate?: string | null;
  orgRoles?: OrgRoleId[] | string[] | null;
  direction?: string | null;
  isTechnical?: boolean;
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
  email?: string;
  phone?: string;
  jobTitle?: string;
  telegram?: string;
  birthDate?: string;
  orgRoles?: OrgRoleId[];
  direction?: string;
  isTechnical?: boolean;
  photo?: File;
}

const appendOrgFields = (formData: FormData, data: UserPayload) => {
  formData.append('orgRoles', JSON.stringify(data.orgRoles ?? []));
  formData.append('direction', data.direction || '');
  formData.append('isTechnical', data.isTechnical ? 'true' : 'false');
};

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
    if (data.email) formData.append('email', data.email);
    if (data.phone) formData.append('phone', data.phone);
    if (data.jobTitle) formData.append('jobTitle', data.jobTitle);
    if (data.telegram) formData.append('telegram', data.telegram);
    if (data.birthDate) formData.append('birthDate', data.birthDate);
    appendOrgFields(formData, data);
    if (data.photo) formData.append('photo', data.photo);

    const response = await apiClient.post<{ data: User }>('/users', formData);
    return response.data.data;
  },

  update: async (id: string, data: UserPayload): Promise<User> => {
    const formData = new FormData();
    formData.append('login', data.login);
    formData.append('name', data.name);
    formData.append('role', data.role);
    formData.append('email', data.email || '');
    formData.append('phone', data.phone || '');
    formData.append('jobTitle', data.jobTitle || '');
    formData.append('telegram', data.telegram || '');
    formData.append('birthDate', data.birthDate || '');
    appendOrgFields(formData, data);
    if (data.password) formData.append('password', data.password);
    if (data.photo) formData.append('photo', data.photo);

    const response = await apiClient.put<{ data: User }>(`/users/${id}`, formData);
    return response.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/users/${id}`);
  },
};
