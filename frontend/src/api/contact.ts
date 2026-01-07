import { apiClient } from './client';

export interface ContactFormData {
  name: string;
  company?: string;
  email: string;
  phone?: string;
  budget?: string;
  description: string;
  pageCount?: number;
  calculatedPrice?: number;
}

export const contactApi = {
  sendContact: async (data: ContactFormData) => {
    const response = await apiClient.post('/contact', data);
    return response.data;
  },
};
