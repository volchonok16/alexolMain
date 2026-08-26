import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { contactApi } from '@/api';

export const useConsultationModal = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
  });

  const mutation = useMutation({
    mutationFn: contactApi.sendContact,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      description: formData.message,
      source: 'consultation_modal',
    });
  };

  return {
    formData,
    handleChange,
    handleSubmit,
    isLoading: mutation.isPending,
    isSuccess: mutation.isSuccess,
    error: mutation.error,
    resetForm: () => setFormData({ name: '', email: '', phone: '', message: '' }),
  };
};
