import { apiClient } from './client';

export type LeadStatus = 'new' | 'in_progress' | 'closed';

export interface Lead {
  id: string;
  name: string;
  company?: string | null;
  email: string;
  phone?: string | null;
  budget?: string | null;
  description: string;
  pageCount?: number | null;
  calculatedPrice?: number | null;
  source: string;
  status: LeadStatus;
  createdAt: string;
  updatedAt: string;
}

export interface LeadsResponse {
  data: Lead[];
  total: number;
  page: number;
  limit: number;
}

export const leadsApi = {
  getAll: async (page = 1, limit = 20): Promise<LeadsResponse> => {
    const response = await apiClient.get<LeadsResponse>('/leads', { params: { page, limit } });
    return response.data;
  },

  getById: async (id: string): Promise<Lead> => {
    const response = await apiClient.get<{ data: Lead }>(`/leads/${id}`);
    return response.data.data;
  },

  updateStatus: async (id: string, status: LeadStatus): Promise<Lead> => {
    const response = await apiClient.patch<{ data: Lead }>(`/leads/${id}`, { status });
    return response.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/leads/${id}`);
  },
};
