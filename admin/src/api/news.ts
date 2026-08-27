import { apiClient } from './client';

export interface News {
  id: string;
  title: string;
  text: string;
  photo: string;
  createdAt?: string;
  creationDate?: string;
}

export interface CreateNewsRequest {
  title: string;
  text: string;
  photo: string | File;
}

export const newsApi = {
  getAll: async (): Promise<News[]> => {
    const response = await apiClient.get<{ data: News[]; total: number }>('/news', {
      params: { page: 1, limit: 100 },
    });
    return response.data.data;
  },

  getById: async (id: string): Promise<News> => {
    const response = await apiClient.get<{ data: News }>(`/news/${id}`);
    return response.data.data;
  },

  create: async (data: CreateNewsRequest): Promise<News> => {
    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('text', data.text);
    formData.append('photo', data.photo);
    const response = await apiClient.post<{ data: News }>('/news', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data;
  },

  update: async (id: string, data: CreateNewsRequest): Promise<News> => {
    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('text', data.text);
    formData.append('photo', data.photo);
    const response = await apiClient.put<{ data: News }>(`/news/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/news/${id}`);
  },
};
