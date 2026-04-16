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

export const categoriesService = {
  /**
   * Get all categories (default + user's custom)
   */
  async getCategories(): Promise<Category[]> {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('is_default', { ascending: false })
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }

    return data || [];
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
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('categories')
      .insert({
        user_id: user.id,
        name: input.name,
        icon: input.icon || 'tag',
        color: input.color || '#6b7280',
        is_default: false,
        budget_amount: input.budget_amount || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating category:', error);
      throw error;
    }

    return data;
  },

  /**
   * Update a custom category
   */
  async updateCategory(
    id: string,
    input: { name?: string; icon?: string; color?: string; budget_amount?: number }
  ): Promise<Category> {
    const { data, error } = await supabase
      .from('categories')
      .update(input)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating category:', error);
      throw error;
    }

    return data;
  },

  /**
   * Delete a custom category
   */
  async deleteCategory(id: string): Promise<void> {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting category:', error);
      throw error;
    }
  },
};
