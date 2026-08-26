import { useState, useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';
import { contactApi } from '@/api';

const PRICING_MAP: Record<string, { base: number; perUnit: number }> = {
  landing: { base: 75000, perUnit: 25000 },
  corporate: { base: 150000, perUnit: 40000 },
  ecommerce: { base: 400000, perUnit: 75000 },
  crm: { base: 500000, perUnit: 100000 },
  mobile: { base: 300000, perUnit: 60000 },
  desktop: { base: 350000, perUnit: 75000 },
  api: { base: 200000, perUnit: 50000 },
  ai: { base: 600000, perUnit: 125000 },
};

export const usePricingModal = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    appType: '',
    pageCount: 5,
  });

  const calculatedPrice = useMemo(() => {
    if (!formData.appType) return 0;
    const config = PRICING_MAP[formData.appType];
    if (!config) return 0;
    return config.base + formData.pageCount * config.perUnit;
  }, [formData.appType, formData.pageCount]);

  const mutation = useMutation({
    mutationFn: contactApi.sendContact,
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement> | { target: { name: string; value: string } }
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'pageCount' ? Number(value) : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      description: `Тип: ${formData.appType}, Количество: ${formData.pageCount}`,
      pageCount: formData.pageCount,
      calculatedPrice,
      source: 'pricing_modal',
    });
  };

  return {
    formData,
    calculatedPrice,
    handleChange,
    handleSubmit,
    isLoading: mutation.isPending,
    isSuccess: mutation.isSuccess,
    error: mutation.error,
    resetForm: () => setFormData({ name: '', email: '', phone: '', appType: '', pageCount: 5 }),
  };
};
