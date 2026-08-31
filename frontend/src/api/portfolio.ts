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
  // Old rows pointed at minio.alexol.io, which has no HTTPS vhost (SNI fell through to admin 404s).
  if (/^https?:\/\/minio\.alexol\.io\b/i.test(url)) {
    return `https://api.alexol.io${url.replace(/^https?:\/\/minio\.alexol\.io/i, '')}`;
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
