import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { contactApi } from '@/api';

export const useContactForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    budget: '',
    message: '',
  });

  const mutation = useMutation({
    mutationFn: contactApi.sendContact,
    onSuccess: () => {
      setFormData({ name: '', company: '', email: '', phone: '', budget: '', message: '' });
    },
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      name: formData.name,
      company: formData.company,
      email: formData.email,
      phone: formData.phone,
      budget: formData.budget,
      description: formData.message,
      source: 'contact_form',
    });
  };

  return {
    formData,
    handleChange,
    handleSubmit,
    isLoading: mutation.isPending,
    isSuccess: mutation.isSuccess,
    error: mutation.error,
  };
};
