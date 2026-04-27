import { apiClient } from '@spendsmart/shared';
import { supabase } from '@/lib/supabase';

export interface ForecastPoint {
  date: string;
  predicted: number;
  variable?: number;
  bills?: number;
  lower_bound?: number;
  upper_bound?: number;
}

export interface ForecastSummary {
  predicted_monthly_total: number;
  predicted_variable_spending?: number;
  predicted_bills?: number;
  predicted_daily_average: number;
  current_daily_average: number;
  historical_monthly_average: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

export interface BillBreakdown {
  name: string;
  amount: number;
  occurrences: number;
  total: number;
}

export interface SpendingForecast {
  has_sufficient_data: boolean;
  message?: string;
  forecast: ForecastPoint[];
  summary: ForecastSummary;
  bills_breakdown?: BillBreakdown[];
}

export interface CashFlowProjectionPoint {
  date: string;
  balance: number;
  expected_spending: number;
  bills_due: number;
  income_received: number;
  is_danger: boolean;
  is_warning: boolean;
}

export interface CashFlowForecast {
  current_balance: number;
  projected_end_balance: number;
  min_balance: number;
  min_balance_date: string;
  avg_daily_spending: number;
  total_bills_upcoming: number;
  total_income_upcoming: number;
  total_projected_spending: number;
  has_danger_zone: boolean;
  danger_zone_days: string[];
  pay_dates: string[];
  paycheck_amount: number;
  projection: CashFlowProjectionPoint[];
}

async function ensureAuthToken(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    apiClient.setToken(session.access_token);
  } else {
    throw new Error('User not authenticated');
  }
}

export const predictionsService = {
  /**
   * Get spending forecast for the next N days
   */
  async getSpendingForecast(
    daysAhead: number = 30,
    daysBack: number = 90,
  ): Promise<SpendingForecast> {
    await ensureAuthToken();
    const params = new URLSearchParams();
    params.append('days_ahead', daysAhead.toString());
    params.append('days_back', daysBack.toString());
    return apiClient.get<SpendingForecast>(`/api/v1/predictions/spending?${params.toString()}`);
  },

  /**
   * Get spending forecast for a specific category
   */
  async getCategoryForecast(
    categoryId: string,
    daysAhead: number = 30,
    daysBack: number = 90,
  ): Promise<SpendingForecast> {
    await ensureAuthToken();
    const params = new URLSearchParams();
    params.append('days_ahead', daysAhead.toString());
    params.append('days_back', daysBack.toString());
    return apiClient.get<SpendingForecast>(
      `/api/v1/predictions/spending/category/${categoryId}?${params.toString()}`
    );
  },

  /**
   * Get cash flow projection for the next N days
   */
  async getCashFlowForecast(daysAhead: number = 30): Promise<CashFlowForecast> {
    await ensureAuthToken();
    const params = new URLSearchParams();
    params.append('days_ahead', daysAhead.toString());
    return apiClient.get<CashFlowForecast>(`/api/v1/predictions/cashflow?${params.toString()}`);
  },
};
