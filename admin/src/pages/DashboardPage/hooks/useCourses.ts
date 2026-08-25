import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CoursePayload, coursesApi } from '@/api/courses';

export const useCourses = () => {
  const queryClient = useQueryClient();
  const [uploadProgress, setUploadProgress] = useState(0);

  const { data: courses = [], isLoading, error } = useQuery({
    queryKey: ['courses'],
    queryFn: coursesApi.getAll,
  });

  const createMutation = useMutation({
    mutationFn: (data: CoursePayload) => {
      setUploadProgress(0);
      return coursesApi.create(data, setUploadProgress);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      setUploadProgress(0);
    },
    onError: () => {
      setUploadProgress(0);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CoursePayload }) => {
      setUploadProgress(0);
      return coursesApi.update(id, data, setUploadProgress);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      setUploadProgress(0);
    },
    onError: () => {
      setUploadProgress(0);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: coursesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
    },
  });

  return {
    courses,
    isLoading,
    error,
    uploadProgress,
    isSaving: createMutation.isPending || updateMutation.isPending,
    createCourse: createMutation.mutateAsync,
    updateCourse: updateMutation.mutateAsync,
    deleteCourse: deleteMutation.mutate,
  };
};
