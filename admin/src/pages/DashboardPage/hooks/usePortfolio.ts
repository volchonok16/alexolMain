import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PortfolioPayload, portfolioApi } from '@/api/portfolio';

export const usePortfolio = () => {
  const queryClient = useQueryClient();

  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ['portfolio'],
    queryFn: portfolioApi.getAll,
  });

  const createMutation = useMutation({
    mutationFn: (data: PortfolioPayload) => portfolioApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: PortfolioPayload }) =>
      portfolioApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: portfolioApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
    },
  });

  return {
    items,
    isLoading,
    error,
    isSaving: createMutation.isPending || updateMutation.isPending,
    createItem: createMutation.mutateAsync,
    updateItem: updateMutation.mutateAsync,
    deleteItem: deleteMutation.mutate,
  };
};
