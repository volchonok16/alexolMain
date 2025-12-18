import { useQuery } from '@tanstack/react-query';
import { newsApi } from '@/api';

export const useNews = () => {
  const {
    data = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['news'],
    queryFn: newsApi.getNews,
    staleTime: 5 * 60 * 1000,
  });

  return { news: data, isLoading, error };
};
