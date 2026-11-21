import { useCallback, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { contactApi } from '@/api';

export const useProjectModal = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    budget: '',
    message: '',
  });

  const mutation = useMutation({
    mutationFn: contactApi.sendContact,
  });
  const { mutate, reset } = mutation;

  const handleChange = useCallback((
    e:
      | React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
      | { target: { name: string; value: string } }
  ) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  }, []);

  const prefillEmail = useCallback((email: string) => {
    setFormData(prev => ({ ...prev, email }));
  }, []);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    mutate({
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      budget: formData.budget,
      description: formData.message,
    });
  }, [formData, mutate]);

  const resetForm = useCallback(() => {
    setFormData({ name: '', email: '', phone: '', budget: '', message: '' });
    reset();
  }, [reset]);

  return {
    formData,
    handleChange,
    handleSubmit,
    isLoading: mutation.isPending,
    isSuccess: mutation.isSuccess,
    error: mutation.error,
    resetForm,
    prefillEmail,
  };
};
