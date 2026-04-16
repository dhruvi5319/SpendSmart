import { apiClient } from '@spendsmart/shared';
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

export interface ExpenseSummary {
  total_amount: number;
  total_user_share: number;
  household_total: number;
  personal_total: number;
  transaction_count: number;
  by_category: Array<{
    category_id: string | null;
    category_name: string;
    total: number;
    count: number;
    icon?: string;
    color?: string;
  }>;
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

export const expensesService = {
  /**
   * Get all expenses for the current user
   */
  async getExpenses(filters?: ExpenseFilters, limit = 50, offset = 0): Promise<Expense[]> {
    await ensureAuthToken();

    const params = new URLSearchParams();
    params.append('skip', offset.toString());
    params.append('limit', limit.toString());

    if (filters?.start_date) params.append('start_date', filters.start_date);
    if (filters?.end_date) params.append('end_date', filters.end_date);
    if (filters?.category_id) params.append('category_id', filters.category_id);
    if (filters?.is_household !== undefined) params.append('is_household', filters.is_household.toString());
    if (filters?.search) params.append('search', filters.search);

    return apiClient.get<Expense[]>(`/api/v1/expenses?${params.toString()}`);
  },

  /**
   * Get a single expense by ID
   */
  async getExpense(id: string): Promise<Expense | null> {
    await ensureAuthToken();
    try {
      return await apiClient.get<Expense>(`/api/v1/expenses/${id}`);
    } catch (error) {
      console.error('Error fetching expense:', error);
      return null;
    }
  },

  /**
   * Create a new expense
   */
  async createExpense(input: CreateExpenseInput): Promise<Expense> {
    await ensureAuthToken();
    return apiClient.post<Expense>('/api/v1/expenses', input);
  },

  /**
   * Update an expense
   */
  async updateExpense(id: string, input: UpdateExpenseInput): Promise<Expense> {
    await ensureAuthToken();
    return apiClient.put<Expense>(`/api/v1/expenses/${id}`, input);
  },

  /**
   * Delete an expense
   */
  async deleteExpense(id: string): Promise<void> {
    await ensureAuthToken();
    await apiClient.delete(`/api/v1/expenses/${id}`);
  },

  /**
   * Get expense summary for a date range
   */
  async getExpenseSummary(startDate: string, endDate: string) {
    await ensureAuthToken();

    const params = new URLSearchParams();
    params.append('start_date', startDate);
    params.append('end_date', endDate);

    const summary = await apiClient.get<ExpenseSummary>(`/api/v1/expenses/summary?${params.toString()}`);

    // Transform to match existing frontend expectations
    return {
      totalAmount: summary.total_amount,
      totalUserShare: summary.total_user_share,
      householdTotal: summary.household_total,
      personalTotal: summary.personal_total,
      transactionCount: summary.transaction_count,
      byCategory: summary.by_category.map((cat) => ({
        name: cat.category_name,
        icon: cat.icon || 'more-horizontal',
        color: cat.color || '#6b7280',
        total: cat.total,
        count: cat.count,
      })),
    };
  },
};
