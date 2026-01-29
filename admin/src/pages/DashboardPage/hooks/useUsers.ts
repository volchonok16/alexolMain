import { useQuery } from '@tanstack/react-query';
import { usersApi } from '@/api/users';
import { useState } from 'react';

export const useUsers = () => {
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const { data, isLoading, error } = useQuery({
    queryKey: ['users', page, limit],
    queryFn: async () => {
      const response = await usersApi.getAll(page, limit);
      return response.data.data;
    },
  });

  return {
    users: data?.users || [],
    pagination: data?.pagination,
    isLoading,
    error,
    page,
    setPage,
  };
};
