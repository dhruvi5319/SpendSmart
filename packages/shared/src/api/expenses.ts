import { apiClient } from './client';
import type {
  Expense,
  ExpenseCreate,
  ExpenseUpdate,
  ExpenseSummary,
  ExpenseFilters,
} from '../types/expense';

export const expensesApi = {
  getAll: async (params?: ExpenseFilters & { skip?: number; limit?: number }) => {
    return apiClient.get<Expense[]>('/api/v1/expenses', { params });
  },

  getById: async (id: string) => {
    return apiClient.get<Expense>(`/api/v1/expenses/${id}`);
  },

  getSummary: async (params?: { start_date?: string; end_date?: string }) => {
    return apiClient.get<ExpenseSummary>('/api/v1/expenses/summary', { params });
  },

  create: async (data: ExpenseCreate) => {
    return apiClient.post<Expense>('/api/v1/expenses', data);
  },

  update: async (id: string, data: ExpenseUpdate) => {
    return apiClient.put<Expense>(`/api/v1/expenses/${id}`, data);
  },

  delete: async (id: string) => {
    return apiClient.delete<void>(`/api/v1/expenses/${id}`);
  },
};
