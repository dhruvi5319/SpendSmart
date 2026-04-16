export interface User {
  id: string;
  email: string;
  display_name: string | null;
  primary_currency: string;
  household_size: number;
  reminder_time: string;
  reminder_enabled: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface UserUpdate {
  display_name?: string;
  primary_currency?: string;
  household_size?: number;
  reminder_time?: string;
  reminder_enabled?: boolean;
}

export interface UserProfile {
  user: User;
  total_expenses: number;
  total_spent_this_month: number;
  current_streak: number;
  longest_streak: number;
}
