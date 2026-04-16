import { supabase } from '@/lib/supabase';

export interface Expense {
  id: string;
  user_id: string;
  category_id: string | null;
  amount: number;
  user_share: number;
  currency: string;
  exchange_rate: number;
  description: string;
  notes: string | null;
  expense_date: string;
  is_household: boolean;
  household_size: number;
  is_recurring: boolean;
  recurring_id: string | null;
  receipt_url: string | null;
  source: 'manual' | 'receipt_scan' | 'csv_import' | 'splitwise';
  ml_category_confidence: number | null;
  created_at: string;
  updated_at: string | null;
  // Joined fields
  category?: {
    id: string;
    name: string;
    icon: string;
    color: string;
  };
}

export interface CreateExpenseInput {
  amount: number;
  description: string;
  expense_date: string;
  category_id?: string | null;
  is_household?: boolean;
  household_size?: number;
  is_recurring?: boolean;
  notes?: string;
  currency?: string;
  source?: 'manual' | 'receipt_scan' | 'csv_import' | 'splitwise';
}

export interface UpdateExpenseInput extends Partial<CreateExpenseInput> {}

export interface ExpenseFilters {
  start_date?: string;
  end_date?: string;
  category_id?: string;
  is_household?: boolean;
  search?: string;
}

export const expensesService = {
  /**
   * Get all expenses for the current user
   */
  async getExpenses(filters?: ExpenseFilters, limit = 50, offset = 0): Promise<Expense[]> {
    let query = supabase
      .from('expenses')
      .select(`
        *,
        category:categories(id, name, icon, color)
      `)
      .order('expense_date', { ascending: false })
      .range(offset, offset + limit - 1);

    if (filters?.start_date) {
      query = query.gte('expense_date', filters.start_date);
    }
    if (filters?.end_date) {
      query = query.lte('expense_date', filters.end_date);
    }
    if (filters?.category_id) {
      query = query.eq('category_id', filters.category_id);
    }
    if (filters?.is_household !== undefined) {
      query = query.eq('is_household', filters.is_household);
    }
    if (filters?.search) {
      query = query.ilike('description', `%${filters.search}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching expenses:', error);
      throw error;
    }

    return data || [];
  },

  /**
   * Get a single expense by ID
   */
  async getExpense(id: string): Promise<Expense | null> {
    const { data, error } = await supabase
      .from('expenses')
      .select(`
        *,
        category:categories(id, name, icon, color)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching expense:', error);
      throw error;
    }

    return data;
  },

  /**
   * Create a new expense
   */
  async createExpense(input: CreateExpenseInput): Promise<Expense> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User not authenticated');
    }

    // Get user's household size from profile if not provided
    let householdSize = input.household_size || 1;
    if (input.is_household && !input.household_size) {
      const { data: profile } = await supabase
        .from('users')
        .select('household_size')
        .eq('id', user.id)
        .single();

      if (profile?.household_size) {
        householdSize = profile.household_size;
      }
    }

    const expenseData = {
      user_id: user.id,
      amount: input.amount,
      user_share: input.is_household ? input.amount / householdSize : input.amount,
      description: input.description,
      expense_date: input.expense_date,
      category_id: input.category_id || null,
      is_household: input.is_household || false,
      household_size: householdSize,
      is_recurring: input.is_recurring || false,
      notes: input.notes || null,
      currency: input.currency || 'USD',
      source: input.source || 'manual',
    };

    const { data, error } = await supabase
      .from('expenses')
      .insert(expenseData)
      .select(`
        *,
        category:categories(id, name, icon, color)
      `)
      .single();

    if (error) {
      console.error('Error creating expense:', error);
      throw error;
    }

    return data;
  },

  /**
   * Update an expense
   */
  async updateExpense(id: string, input: UpdateExpenseInput): Promise<Expense> {
    const updateData: Record<string, unknown> = {};

    if (input.amount !== undefined) updateData.amount = input.amount;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.expense_date !== undefined) updateData.expense_date = input.expense_date;
    if (input.category_id !== undefined) updateData.category_id = input.category_id;
    if (input.is_household !== undefined) updateData.is_household = input.is_household;
    if (input.household_size !== undefined) updateData.household_size = input.household_size;
    if (input.is_recurring !== undefined) updateData.is_recurring = input.is_recurring;
    if (input.notes !== undefined) updateData.notes = input.notes;
    if (input.currency !== undefined) updateData.currency = input.currency;

    // Recalculate user_share if amount or household settings changed
    if (input.amount !== undefined || input.is_household !== undefined || input.household_size !== undefined) {
      const amount = input.amount || 0;
      const isHousehold = input.is_household || false;
      const householdSize = input.household_size || 1;
      updateData.user_share = isHousehold ? amount / householdSize : amount;
    }

    const { data, error } = await supabase
      .from('expenses')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        category:categories(id, name, icon, color)
      `)
      .single();

    if (error) {
      console.error('Error updating expense:', error);
      throw error;
    }

    return data;
  },

  /**
   * Delete an expense
   */
  async deleteExpense(id: string): Promise<void> {
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting expense:', error);
      throw error;
    }
  },

  /**
   * Get expense summary for a date range
   */
  async getExpenseSummary(startDate: string, endDate: string) {
    const { data, error } = await supabase
      .from('expenses')
      .select(`
        amount,
        user_share,
        is_household,
        category:categories(id, name, icon, color)
      `)
      .gte('expense_date', startDate)
      .lte('expense_date', endDate);

    if (error) {
      console.error('Error fetching expense summary:', error);
      throw error;
    }

    // Calculate totals
    const totalAmount = data?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
    const totalUserShare = data?.reduce((sum, e) => sum + Number(e.user_share), 0) || 0;
    const householdTotal = data?.filter(e => e.is_household).reduce((sum, e) => sum + Number(e.user_share), 0) || 0;
    const personalTotal = data?.filter(e => !e.is_household).reduce((sum, e) => sum + Number(e.user_share), 0) || 0;

    // Group by category
    const byCategory = data?.reduce((acc, expense) => {
      const categoryName = expense.category?.name || 'Other';
      if (!acc[categoryName]) {
        acc[categoryName] = {
          name: categoryName,
          icon: expense.category?.icon || 'more-horizontal',
          color: expense.category?.color || '#6b7280',
          total: 0,
          count: 0,
        };
      }
      acc[categoryName].total += Number(expense.user_share);
      acc[categoryName].count += 1;
      return acc;
    }, {} as Record<string, { name: string; icon: string; color: string; total: number; count: number }>);

    return {
      totalAmount,
      totalUserShare,
      householdTotal,
      personalTotal,
      transactionCount: data?.length || 0,
      byCategory: Object.values(byCategory || {}),
    };
  },
};
