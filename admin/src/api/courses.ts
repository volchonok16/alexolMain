import { apiClient } from './client';

export interface Course {
  id: string;
  title: string;
  topic: string;
  description: string;
  videoUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface CoursePayload {
  title: string;
  topic: string;
  description: string;
  video?: File;
}

const COURSE_UPLOAD_TIMEOUT_MS = 2 * 60 * 60 * 1000;

export const coursesApi = {
  getAll: async (): Promise<Course[]> => {
    const response = await apiClient.get<{ data: Course[] }>('/courses', {
      params: { limit: 100 },
    });
    return response.data.data;
  },

  getById: async (id: string): Promise<Course> => {
    const response = await apiClient.get<{ data: Course }>(`/courses/${id}`);
    return response.data.data;
  },

  create: async (
    data: CoursePayload,
    onUploadProgress?: (percent: number) => void
  ): Promise<Course> => {
    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('topic', data.topic);
    formData.append('description', data.description);
    if (data.video) {
      formData.append('video', data.video);
    }

    const response = await apiClient.post<{ data: Course }>('/courses', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: COURSE_UPLOAD_TIMEOUT_MS,
      onUploadProgress: event => {
        if (!event.total) return;
        onUploadProgress?.(Math.round((event.loaded * 100) / event.total));
      },
    });
    return response.data.data;
  },

  update: async (
    id: string,
    data: CoursePayload,
    onUploadProgress?: (percent: number) => void
  ): Promise<Course> => {
    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('topic', data.topic);
    formData.append('description', data.description);
    if (data.video) {
      formData.append('video', data.video);
    }

    const response = await apiClient.put<{ data: Course }>(`/courses/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: COURSE_UPLOAD_TIMEOUT_MS,
      onUploadProgress: event => {
        if (!event.total) return;
        onUploadProgress?.(Math.round((event.loaded * 100) / event.total));
      },
    });
    return response.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/courses/${id}`);
  },
};
