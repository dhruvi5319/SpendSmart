import { apiClient } from './client';
import type { Category, CategoryCreate, CategoryUpdate } from '../types/category';

export const categoriesApi = {
  getAll: async () => {
    return apiClient.get<Category[]>('/api/v1/categories');
  },

  getById: async (id: string) => {
    return apiClient.get<Category>(`/api/v1/categories/${id}`);
  },

  create: async (data: CategoryCreate) => {
    return apiClient.post<Category>('/api/v1/categories', data);
  },

  update: async (id: string, data: CategoryUpdate) => {
    return apiClient.put<Category>(`/api/v1/categories/${id}`, data);
  },

  delete: async (id: string, reassignTo?: string) => {
    const params = reassignTo ? { reassign_to: reassignTo } : undefined;
    return apiClient.delete<void>(`/api/v1/categories/${id}`, { params });
  },
};
