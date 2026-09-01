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
  // Portfolio files live on alexol_minio (:9000), published at https://api.alexol.io/courses/...
  // minio.alexol.io and docker-internal hosts must not be used in the browser.
  const rewritten = url
    .replace(/^https?:\/\/minio\.alexol\.io(?=\/|$)/i, 'https://api.alexol.io')
    .replace(/^https?:\/\/127\.0\.0\.1:9000(?=\/|$)/i, 'https://api.alexol.io')
    .replace(/^https?:\/\/localhost:9000(?=\/|$)/i, 'https://api.alexol.io')
    .replace(/^https?:\/\/minio:9000(?=\/|$)/i, 'https://api.alexol.io');
  if (rewritten.startsWith('http')) return rewritten;
  const isDev = window.location.hostname === 'localhost';
  const apiOrigin = isDev ? 'http://localhost:3000' : 'https://api.alexol.io';
  return `${apiOrigin}${rewritten.startsWith('/') ? rewritten : `/${rewritten}`}`;
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
