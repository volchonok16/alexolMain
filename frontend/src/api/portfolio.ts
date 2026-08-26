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
  createdAt: string;
  updatedAt: string;
}

const resolveImageUrl = (url: string): string => {
  // Seeded items still store http://minio.alexol.io; HTTPS is required on the live site.
  if (url.startsWith('http://minio.alexol.io')) {
    return `https://${url.slice('http://'.length)}`;
  }
  if (url.startsWith('http')) return url;
  const isDev = window.location.hostname === 'localhost';
  const apiOrigin = isDev ? 'http://localhost:3000' : 'https://api.alexol.io';
  return `${apiOrigin}${url.startsWith('/') ? url : `/${url}`}`;
};

const mapPortfolioItem = (item: PortfolioItem): PortfolioItem => ({
  ...item,
  imageUrl: resolveImageUrl(item.imageUrl),
});

export const portfolioApi = {
  getAll: async (): Promise<PortfolioItem[]> => {
    const { data } = await apiClient.get<{ data: PortfolioItem[] }>('/portfolio', {
      params: { limit: 100 },
    });
    return data.data.map(mapPortfolioItem);
  },
};
