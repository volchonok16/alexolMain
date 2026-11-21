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
  date: string;
  image: string;
}

// Remove hashtags and HTML tags from text for display
const cleanText = (text: string): string => {
  return text
    .replace(/<[^>]+>/g, '') // Remove HTML tags
    .replace(/#[а-яёa-z0-9_]+/gi, '') // Remove hashtags
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();
};

const mapNewsArticle = (item: NewsApiResponse): NewsArticle => {
  const textWithoutTags = cleanText(item.text);
  
  let imageUrl = item.photo
    .replace(/^https?:\/\/minio\.alexol\.io(?=\/|$)/i, 'https://api.alexol.io')
    .replace(/^https?:\/\/127\.0\.0\.1:9000(?=\/|$)/i, 'https://api.alexol.io')
    .replace(/^https?:\/\/localhost:9000(?=\/|$)/i, 'https://api.alexol.io')
    .replace(/^https?:\/\/minio:9000(?=\/|$)/i, 'https://api.alexol.io');
  if (!imageUrl.startsWith('http')) {
    const isDev = window.location.hostname === 'localhost';
    const apiOrigin = isDev ? 'http://localhost:3000' : 'https://api.alexol.io';
    imageUrl = `${apiOrigin}${item.photo.startsWith('/') ? item.photo : `/${item.photo}`}`;
  }
  
  return {
    id: item.id,
    category: 'Новости',
    title: item.title,
    excerpt: textWithoutTags.substring(0, 150) + '...',
    date: new Date(item.creationDate).toLocaleDateString('ru-RU'),
    image: imageUrl,
  };
};

export const newsApi = {
  getNews: async (page: number, limit: number): Promise<{ data: NewsArticle[]; total: number }> => {
    const { data } = await apiClient.get<{ data: NewsApiResponse[]; total: number }>('/news', {
      params: { page, limit },
    });
    return { data: data.data.map(mapNewsArticle), total: data.total };
  },

  getNewsById: async (id: string): Promise<NewsArticle> => {
    const { data } = await apiClient.get<{ data: NewsApiResponse }>(`/news/${id}`);
    return mapNewsArticle(data.data);
  },
};
