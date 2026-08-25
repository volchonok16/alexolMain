import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPayload, usersApi } from '@/api/users';

export const useUsers = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const { data, isLoading, error } = useQuery({
    queryKey: ['users', page, limit],
    queryFn: () => usersApi.getAll(page, limit),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['users'] });
  };

  const createMutation = useMutation({
    mutationFn: usersApi.create,
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UserPayload }) => usersApi.update(id, data),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: usersApi.delete,
    onSuccess: invalidate,
  });

  return {
    users: data?.users || [],
    pagination: data?.pagination,
    isLoading,
    error,
    page,
    setPage,
    isSaving: createMutation.isPending || updateMutation.isPending,
    createUser: createMutation.mutateAsync,
    updateUser: updateMutation.mutateAsync,
    deleteUser: deleteMutation.mutate,
  };
};
