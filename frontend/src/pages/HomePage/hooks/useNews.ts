import { useQuery } from '@tanstack/react-query';
import { newsApi } from '@/api';

const PAGE_SIZE = 6;

export const useNews = (page: number) => {
  const {
    data,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['news', page],
    queryFn: () => newsApi.getNews(page, PAGE_SIZE),
    staleTime: 5 * 60 * 1000,
  });

  return {
    news: data?.data ?? [],
    total: data?.total ?? 0,
    totalPages: Math.ceil((data?.total ?? 0) / PAGE_SIZE),
    isLoading,
    error,
  };
};
