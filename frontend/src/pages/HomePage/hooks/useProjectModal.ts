import { useState } from 'react';
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

  const handleChange = (
    e:
      | React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
      | { target: { name: string; value: string } }
  ) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const prefillEmail = (email: string) => {
    setFormData(prev => ({ ...prev, email }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      budget: formData.budget,
      description: formData.message,
      source: 'project_modal',
    });
  };

  return {
    formData,
    handleChange,
    handleSubmit,
    isLoading: mutation.isPending,
    isSuccess: mutation.isSuccess,
    error: mutation.error,
    resetForm: () => setFormData({ name: '', email: '', phone: '', budget: '', message: '' }),
    prefillEmail,
  };
};
