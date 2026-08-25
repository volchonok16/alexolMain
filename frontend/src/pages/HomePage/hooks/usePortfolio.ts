import { useQuery } from '@tanstack/react-query';
import { portfolioApi } from '@/api';

export const usePortfolio = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['portfolio'],
    queryFn: portfolioApi.getAll,
    staleTime: 5 * 60 * 1000,
  });

  return {
    projects: data ?? [],
    isLoading,
    error,
  };
};
