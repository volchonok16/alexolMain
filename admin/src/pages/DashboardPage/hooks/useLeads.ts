import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LeadStatus, leadsApi } from '@/api/leads';

export const useLeads = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const { data, isLoading, error } = useQuery({
    queryKey: ['leads', page, limit],
    queryFn: () => leadsApi.getAll(page, limit),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['leads'] });
  };

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: LeadStatus }) => leadsApi.updateStatus(id, status),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: leadsApi.delete,
    onSuccess: invalidate,
  });

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return {
    leads: data?.data ?? [],
    total,
    totalPages,
    isLoading,
    error,
    page,
    setPage,
    updateStatus: updateStatusMutation.mutate,
    deleteLead: deleteMutation.mutate,
  };
};
