import { useQuery } from '@tanstack/react-query';
import { newsApi } from '@/api';

export const useNewsById = (id: string | null) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['news', id],
    queryFn: () => newsApi.getNewsById(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });

  return { article: data, isLoading, error };
};
