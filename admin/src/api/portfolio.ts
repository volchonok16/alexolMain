import { apiClient } from './client';

export const PORTFOLIO_CATEGORIES = ['Crypto', 'eCommerce', 'Enterprise', 'Automation'] as const;

export interface PortfolioItem {
  id: string;
  category: string;
  titleRu: string;
  titleEn: string;
  descriptionRu: string;
  descriptionEn: string;
  resultRu: string;
  resultEn: string;
  link: string | null;
  imageUrl: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface PortfolioPayload {
  category: string;
  titleRu: string;
  titleEn: string;
  descriptionRu: string;
  descriptionEn: string;
  resultRu: string;
  resultEn: string;
  link?: string;
  sortOrder?: number;
  image?: File;
}

export const portfolioApi = {
  getAll: async (): Promise<PortfolioItem[]> => {
    const response = await apiClient.get<{ data: PortfolioItem[] }>('/portfolio', {
      params: { limit: 100 },
    });
    return response.data.data;
  },

  getById: async (id: string): Promise<PortfolioItem> => {
    const response = await apiClient.get<{ data: PortfolioItem }>(`/portfolio/${id}`);
    return response.data.data;
  },

  create: async (data: PortfolioPayload): Promise<PortfolioItem> => {
    const formData = toFormData(data);
    const response = await apiClient.post<{ data: PortfolioItem }>('/portfolio', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data;
  },

  update: async (id: string, data: PortfolioPayload): Promise<PortfolioItem> => {
    const formData = toFormData(data);
    const response = await apiClient.put<{ data: PortfolioItem }>(`/portfolio/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/portfolio/${id}`);
  },
};

function toFormData(data: PortfolioPayload): FormData {
  const formData = new FormData();
  formData.append('category', data.category);
  formData.append('titleRu', data.titleRu);
  formData.append('titleEn', data.titleEn);
  formData.append('descriptionRu', data.descriptionRu);
  formData.append('descriptionEn', data.descriptionEn);
  formData.append('resultRu', data.resultRu);
  formData.append('resultEn', data.resultEn);
  formData.append('link', data.link ?? '');
  if (data.sortOrder !== undefined) {
    formData.append('sortOrder', String(data.sortOrder));
  }
  if (data.image) {
    formData.append('image', data.image);
  }
  return formData;
}
