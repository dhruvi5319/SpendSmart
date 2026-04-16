import { apiClient } from '@spendsmart/shared';
import { supabase } from '@/lib/supabase';

export interface Category {
  id: string;
  user_id: string | null;
  name: string;
  icon: string | null;
  color: string | null;
  is_default: boolean;
  budget_amount: number | null;
  budget_currency: string;
  created_at: string;
  updated_at: string | null;
}

// Helper to get and set auth token from Supabase session
async function ensureAuthToken(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    apiClient.setToken(session.access_token);
  } else {
    throw new Error('User not authenticated');
  }
}

export const categoriesService = {
  /**
   * Get all categories (default + user's custom)
   */
  async getCategories(): Promise<Category[]> {
    await ensureAuthToken();
    return apiClient.get<Category[]>('/api/v1/categories');
  },

  /**
   * Create a custom category
   */
  async createCategory(input: {
    name: string;
    icon?: string;
    color?: string;
    budget_amount?: number;
  }): Promise<Category> {
    await ensureAuthToken();
    return apiClient.post<Category>('/api/v1/categories', input);
  },

  /**
   * Update a custom category
   */
  async updateCategory(
    id: string,
    input: { name?: string; icon?: string; color?: string; budget_amount?: number }
  ): Promise<Category> {
    await ensureAuthToken();
    return apiClient.put<Category>(`/api/v1/categories/${id}`, input);
  },

  /**
   * Delete a custom category
   */
  async deleteCategory(id: string): Promise<void> {
    await ensureAuthToken();
    await apiClient.delete(`/api/v1/categories/${id}`);
  },
};
