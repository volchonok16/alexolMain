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

const mapNewsArticle = (item: NewsApiResponse): NewsArticle => ({
  id: item.id,
  category: 'Новости',
  title: item.title,
  excerpt: item.text.substring(0, 150) + '...',
  date: new Date(item.creationDate).toLocaleDateString('ru-RU'),
  image: item.photo.startsWith('http') ? item.photo : `http://localhost:3000${item.photo}`,
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
