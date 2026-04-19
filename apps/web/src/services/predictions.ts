import { apiClient } from '@spendsmart/shared';
import { supabase } from '@/lib/supabase';

export interface ForecastPoint {
  date: string;
  predicted: number;
  lower_bound?: number;
  upper_bound?: number;
}

export interface ForecastSummary {
  predicted_monthly_total: number;
  predicted_daily_average: number;
  current_daily_average: number;
  historical_monthly_average: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

export interface SpendingForecast {
  has_sufficient_data: boolean;
  message?: string;
  forecast: ForecastPoint[];
  summary: ForecastSummary;
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
};
