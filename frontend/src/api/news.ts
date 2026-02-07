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
  
  // Resolve image URL
  let imageUrl = item.photo;
  if (!imageUrl.startsWith('http')) {
    // Development or production - use api.alexol.io for uploads
    const isDev = window.location.hostname === 'localhost';
    const apiOrigin = isDev ? 'http://localhost:3000' : 'https://api.alexol.io';
    imageUrl = `${apiOrigin}${item.photo}`;
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
  getNews: async (): Promise<NewsArticle[]> => {
    const { data } = await apiClient.get<{ data: NewsApiResponse[] }>('/news');
    return data.data.map(mapNewsArticle);
  },

  getNewsById: async (id: string): Promise<NewsArticle> => {
    const { data } = await apiClient.get<{ data: NewsApiResponse }>(`/news/${id}`);
    return mapNewsArticle(data.data);
  },
};
