import { apiClient } from '@spendsmart/shared';
import { supabase } from '@/lib/supabase';

export interface RecurringPattern {
  description: string;
  average_amount: number;
  occurrence_count: number;
  frequency: string;
  average_gap_days: number;
  last_occurrence: string;
  next_expected: string | null;
  category_id: string | null;
  expense_ids: string[];
  is_already_marked: boolean;
}

export interface RecurringPatternsResponse {
  patterns: RecurringPattern[];
  total_count: number;
}

export interface UpcomingRecurring {
  description: string;
  expected_amount: number;
  expected_date: string;
  frequency: string;
  days_until: number;
  category_id: string | null;
}

export interface UpcomingRecurringResponse {
  upcoming: UpcomingRecurring[];
  total_count: number;
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

export const recurringService = {
  /**
   * Detect recurring expense patterns
   */
  async detectPatterns(
    minOccurrences: number = 3,
    lookbackDays: number = 180
  ): Promise<RecurringPatternsResponse> {
    await ensureAuthToken();
    const params = new URLSearchParams();
    params.append('min_occurrences', minOccurrences.toString());
    params.append('lookback_days', lookbackDays.toString());
    return apiClient.get<RecurringPatternsResponse>(`/api/v1/recurring/detect?${params.toString()}`);
  },

  /**
   * Get upcoming recurring expenses
   */
  async getUpcoming(daysAhead: number = 30): Promise<UpcomingRecurringResponse> {
    await ensureAuthToken();
    return apiClient.get<UpcomingRecurringResponse>(`/api/v1/recurring/upcoming?days_ahead=${daysAhead}`);
  },

  /**
   * Mark expenses as recurring
   */
  async markAsRecurring(expenseIds: string[]): Promise<{ updated_count: number; message: string }> {
    await ensureAuthToken();
    return apiClient.post<{ updated_count: number; message: string }>('/api/v1/recurring/mark', {
      expense_ids: expenseIds,
    });
  },
};
