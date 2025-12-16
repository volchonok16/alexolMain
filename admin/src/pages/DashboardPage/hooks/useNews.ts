import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { newsApi } from '@/api/news';

export const useNews = () => {
  const queryClient = useQueryClient();

  const { data: articles = [], isLoading, error } = useQuery({
    queryKey: ['news'],
    queryFn: newsApi.getAll,
  });

  const deleteMutation = useMutation({
    mutationFn: newsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['news'] });
    },
  });

  const createMutation = useMutation({
    mutationFn: newsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['news'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { title: string; text: string; photo: string | File } }) =>
      newsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['news'] });
    },
  });

  return {
    articles,
    isLoading,
    error,
    deleteNews: deleteMutation.mutate,
    createNews: createMutation.mutate,
    updateNews: updateMutation.mutate,
  };
};
