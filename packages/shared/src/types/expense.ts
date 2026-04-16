export type ExpenseSource = 'manual' | 'receipt_scan' | 'csv_import' | 'splitwise';

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
  is_recurring: boolean;
  recurring_id: string | null;
  receipt_url: string | null;
  source: ExpenseSource;
  ml_category_confidence: number | null;
  created_at: string;
  updated_at: string | null;
  // Joined category info
  category_name?: string;
  category_icon?: string;
  category_color?: string;
}

export interface ExpenseCreate {
  amount: number;
  description: string;
  expense_date: string;
  category_id?: string;
  category?: string;
  is_household?: boolean;
  household_size?: number;
  is_recurring?: boolean;
  notes?: string;
  currency?: string;
  source?: ExpenseSource;
}

// Alias for UI components
export type CreateExpenseInput = ExpenseCreate;

export interface ExpenseUpdate {
  amount?: number;
  description?: string;
  expense_date?: string;
  category_id?: string;
  is_household?: boolean;
  notes?: string;
  currency?: string;
}

export interface ExpenseSummary {
  total_count: number;
  total_amount: number;
  total_user_share: number;
  by_category: CategorySummary[];
  by_day: DailySummary[];
  household_total: number;
  personal_total: number;
}

export interface CategorySummary {
  category_id: string | null;
  category_name: string;
  category_icon: string | null;
  category_color: string | null;
  total: number;
  count: number;
}

export interface DailySummary {
  date: string;
  total: number;
}

export interface ExpenseFilters {
  start_date?: string;
  end_date?: string;
  category_id?: string;
  is_household?: boolean;
  search?: string;
}
