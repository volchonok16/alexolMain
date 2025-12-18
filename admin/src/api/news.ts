import { apiClient } from './client';

export interface News {
  id: number;
  title: string;
  text: string;
  photo: string;
  createdAt?: string;
}

export interface CreateNewsRequest {
  title: string;
  text: string;
  photo: string | File;
}

export const newsApi = {
  getAll: async (): Promise<News[]> => {
    const response = await apiClient.get<{ data: News[] }>('/news');
    return response.data.data;
  },

  getById: async (id: number): Promise<News> => {
    const response = await apiClient.get<News>(`/news/${id}`);
    return response.data;
  },

  create: async (data: CreateNewsRequest): Promise<News> => {
    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('text', data.text);
    formData.append('photo', data.photo);
    const response = await apiClient.post<News>('/news', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  update: async (id: number, data: CreateNewsRequest): Promise<News> => {
    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('text', data.text);
    formData.append('photo', data.photo);
    const response = await apiClient.put<News>(`/news/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/news/${id}`);
  },
};
