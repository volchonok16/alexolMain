import { apiClient } from './client';

interface NewsApiResponse {
  id: string;
  title: string;
  text: string;
  photo: string;
  creationDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface NewsArticle {
  id: string;
  category: string;
  title: string;
  excerpt: string;
  text: string;
  date: string;
  image: string;
}

const resolveImageUrl = (photoPath: string): string => {
  if (photoPath.startsWith('http')) return photoPath;
  
  // In production, use API domain; in dev, use localhost
  const isDev = import.meta.env.DEV;
  const apiBase = isDev 
    ? 'http://localhost:3000' 
    : (import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, '') || 'https://api.alexol.io');
  
  return photoPath.startsWith('/') ? `${apiBase}${photoPath}` : `${apiBase}/${photoPath}`;
};

const mapNewsArticle = (item: NewsApiResponse): NewsArticle => ({
  id: item.id,
  category: 'Новости',
  title: item.title,
  excerpt: item.text.substring(0, 150) + (item.text.length > 150 ? '...' : ''),
  text: item.text,
  date: new Date(item.creationDate).toLocaleDateString('ru-RU'),
  image: resolveImageUrl(item.photo),
});

export const newsApi = {
  getNews: async (): Promise<NewsArticle[]> => {
    const { data } = await apiClient.get<{ data: NewsApiResponse[] }>('/news');
    return data.data.map(mapNewsArticle);
  },

  getNewsById: async (id: string): Promise<NewsArticle> => {
    const { data } = await apiClient.get<{ data: NewsApiResponse }>(`/news/${id}`);
    return mapNewsArticle(data.data);
  },
};
