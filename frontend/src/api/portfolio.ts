import { apiClient } from './client';

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
}

export const portfolioApi = {
  getAll: async (): Promise<PortfolioItem[]> => {
    const { data } = await apiClient.get<{ data: PortfolioItem[] }>('/portfolio', {
      params: { limit: 100 },
    });
    return data.data;
  },
};
