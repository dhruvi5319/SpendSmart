import { apiClient } from '@spendsmart/shared';
import { supabase } from '@/lib/supabase';

export interface CategoryAnalysis {
  category_id: string;
  category_name: string;
  icon: string;
  color: string;
  total_spent: number;
  monthly_average: number;
  transaction_count: number;
  category_type: 'needs' | 'wants' | 'savings' | 'uncategorized';
  suggested_budget: number;
  difference: number;
  status: 'over' | 'under' | 'on_track';
}

export interface BudgetRecommendation {
  type: 'success' | 'warning' | 'alert' | 'tip';
  category: string;
  message: string;
  action: string;
}

export interface BudgetRecommendations {
  has_data: boolean;
  message?: string;
  summary?: {
    monthly_income: number;
    monthly_spending: number;
    savings_rate: number;
    needs_percent: number;
    wants_percent: number;
  };
  ideal_allocation?: {
    needs: number;
    wants: number;
    savings: number;
  };
  actual_allocation?: {
    needs: number;
    wants: number;
    other: number;
  };
  categories?: CategoryAnalysis[];
  recommendations?: BudgetRecommendation[];
}

export interface SpendingAnalysis {
  category_id: string;
  category_name: string;
  icon: string;
  color: string;
  total_spent: number;
  monthly_average: number;
  transaction_count: number;
}

async function ensureAuthToken(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    apiClient.setToken(session.access_token);
  } else {
    throw new Error('User not authenticated');
  }
}

export const budgetService = {
  /**
   * Get budget recommendations based on spending history
   */
  async getRecommendations(
    monthlyIncome?: number,
    months: number = 3,
  ): Promise<BudgetRecommendations> {
    await ensureAuthToken();
    const params = new URLSearchParams();
    if (monthlyIncome) params.append('monthly_income', monthlyIncome.toString());
    params.append('months', months.toString());
    return apiClient.get<BudgetRecommendations>(`/api/v1/budget/recommendations?${params.toString()}`);
  },

  /**
   * Get detailed spending analysis by category
   */
  async getSpendingAnalysis(months: number = 3): Promise<SpendingAnalysis[]> {
    await ensureAuthToken();
    const params = new URLSearchParams();
    params.append('months', months.toString());
    return apiClient.get<SpendingAnalysis[]>(`/api/v1/budget/analysis?${params.toString()}`);
  },
};
