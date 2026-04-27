import { apiClient } from '@spendsmart/shared';
import { supabase } from '@/lib/supabase';

export type PayFrequency = 'weekly' | 'biweekly' | 'semimonthly' | 'monthly';

export interface UserProfile {
  id: string;
  email: string;
  display_name: string | null;
  primary_currency: string;
  household_size: number;
  monthly_income: number | null;
  pay_frequency: PayFrequency | null;
  next_pay_date: string | null;
  reminder_time: string;
  reminder_enabled: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface UpdateProfileInput {
  display_name?: string | null;
  primary_currency?: string;
  household_size?: number;
  monthly_income?: number | null;
  pay_frequency?: PayFrequency | null;
  next_pay_date?: string | null;
  reminder_time?: string;
  reminder_enabled?: boolean;
}

async function ensureAuthToken(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    apiClient.setToken(session.access_token);
  } else {
    throw new Error('User not authenticated');
  }
}

export const profileService = {
  /**
   * Get the current user's profile
   */
  async getProfile(): Promise<UserProfile> {
    await ensureAuthToken();
    return apiClient.get<UserProfile>('/api/v1/profile/');
  },

  /**
   * Update the current user's profile
   */
  async updateProfile(data: UpdateProfileInput): Promise<UserProfile> {
    await ensureAuthToken();
    return apiClient.put<UserProfile>('/api/v1/profile/', data);
  },

  /**
   * Delete the current user's account
   */
  async deleteAccount(): Promise<void> {
    await ensureAuthToken();
    return apiClient.delete('/api/v1/profile/');
  },
};
