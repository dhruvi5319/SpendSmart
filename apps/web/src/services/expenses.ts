import axios from 'axios';
import { supabase } from '@/lib/supabase';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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
  total_count: number;  // Backend returns total_count, not transaction_count
  by_category: Array<{
    category_id: string | null;
    category_name: string;
    total: number;
    count: number;
    category_icon?: string;
    category_color?: string;
  }>;
}

// Helper to get auth token from Supabase session
async function getAuthToken(): Promise<string> {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) {
    console.error('Error getting session:', error);
    throw new Error('Failed to get session');
  }
  if (session?.access_token) {
    return session.access_token;
  }
  throw new Error('User not authenticated');
}

// Create axios instance with auth header
async function apiGet<T>(url: string): Promise<T> {
  const token = await getAuthToken();
  const response = await axios.get<T>(`${API_BASE_URL}${url}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

async function apiPost<T>(url: string, data?: unknown): Promise<T> {
  const token = await getAuthToken();
  const response = await axios.post<T>(`${API_BASE_URL}${url}`, data, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  return response.data;
}

async function apiPut<T>(url: string, data?: unknown): Promise<T> {
  const token = await getAuthToken();
  const response = await axios.put<T>(`${API_BASE_URL}${url}`, data, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  return response.data;
}

async function apiDelete<T>(url: string): Promise<T> {
  const token = await getAuthToken();
  const response = await axios.delete<T>(`${API_BASE_URL}${url}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

export const expensesService = {
  /**
   * Get all expenses for the current user
   */
  async getExpenses(filters?: ExpenseFilters, limit = 50, offset = 0): Promise<Expense[]> {
    const params = new URLSearchParams();
    params.append('skip', offset.toString());
    params.append('limit', limit.toString());

    if (filters?.start_date) params.append('start_date', filters.start_date);
    if (filters?.end_date) params.append('end_date', filters.end_date);
    if (filters?.category_id) params.append('category_id', filters.category_id);
    if (filters?.is_household !== undefined) params.append('is_household', filters.is_household.toString());
    if (filters?.search) params.append('search', filters.search);

    return apiGet<Expense[]>(`/api/v1/expenses?${params.toString()}`);
  },

  /**
   * Get a single expense by ID
   */
  async getExpense(id: string): Promise<Expense | null> {
    try {
      return await apiGet<Expense>(`/api/v1/expenses/${id}`);
    } catch (error) {
      console.error('Error fetching expense:', error);
      return null;
    }
  },

  /**
   * Create a new expense
   */
  async createExpense(input: CreateExpenseInput): Promise<Expense> {
    return apiPost<Expense>('/api/v1/expenses', input);
  },

  /**
   * Update an expense
   */
  async updateExpense(id: string, input: UpdateExpenseInput): Promise<Expense> {
    return apiPut<Expense>(`/api/v1/expenses/${id}`, input);
  },

  /**
   * Delete an expense
   */
  async deleteExpense(id: string): Promise<void> {
    await apiDelete(`/api/v1/expenses/${id}`);
  },

  /**
   * Get expense summary for a date range
   */
  async getExpenseSummary(startDate: string, endDate: string) {
    const params = new URLSearchParams();
    params.append('start_date', startDate);
    params.append('end_date', endDate);

    const summary = await apiGet<ExpenseSummary>(`/api/v1/expenses/summary?${params.toString()}`);

    // Transform to match existing frontend expectations
    return {
      totalAmount: summary.total_amount,
      totalUserShare: summary.total_user_share,
      householdTotal: summary.household_total,
      personalTotal: summary.personal_total,
      transactionCount: summary.total_count,  // Backend returns total_count
      byCategory: summary.by_category.map((cat) => ({
        name: cat.category_name,
        icon: cat.category_icon || 'more-horizontal',
        color: cat.category_color || '#6b7280',
        total: cat.total,
        count: cat.count,
      })),
    };
  },
};
