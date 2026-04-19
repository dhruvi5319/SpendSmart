import { apiClient } from '@spendsmart/shared';
import { supabase } from '@/lib/supabase';

export interface Goal {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  target_amount: number;
  current_amount: number;
  currency: string;
  deadline: string | null;
  icon: string | null;
  color: string | null;
  is_completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string | null;
  // Computed fields
  progress_percentage: number;
  remaining_amount: number;
  is_overdue: boolean;
}

export interface GoalListResponse {
  goals: Goal[];
  total_count: number;
  active_count: number;
  completed_count: number;
  total_saved: number;
  total_target: number;
}

export interface CreateGoalInput {
  name: string;
  description?: string;
  target_amount: number;
  current_amount?: number;
  currency?: string;
  deadline?: string;
  icon?: string;
  color?: string;
}

export interface UpdateGoalInput extends Partial<CreateGoalInput> {}

export interface ContributeInput {
  amount: number;
}

async function ensureAuthToken(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    apiClient.setToken(session.access_token);
  } else {
    throw new Error('User not authenticated');
  }
}

export const goalsService = {
  /**
   * Get all goals for the current user
   */
  async getGoals(includeCompleted = true): Promise<GoalListResponse> {
    await ensureAuthToken();
    const params = new URLSearchParams();
    params.append('include_completed', includeCompleted.toString());
    return apiClient.get<GoalListResponse>(`/api/v1/goals?${params.toString()}`);
  },

  /**
   * Get a single goal by ID
   */
  async getGoal(id: string): Promise<Goal | null> {
    await ensureAuthToken();
    try {
      return await apiClient.get<Goal>(`/api/v1/goals/${id}`);
    } catch (error) {
      console.error('Error fetching goal:', error);
      return null;
    }
  },

  /**
   * Create a new goal
   */
  async createGoal(input: CreateGoalInput): Promise<Goal> {
    await ensureAuthToken();
    return apiClient.post<Goal>('/api/v1/goals', input);
  },

  /**
   * Update a goal
   */
  async updateGoal(id: string, input: UpdateGoalInput): Promise<Goal> {
    await ensureAuthToken();
    return apiClient.put<Goal>(`/api/v1/goals/${id}`, input);
  },

  /**
   * Add a contribution to a goal
   */
  async contribute(id: string, amount: number): Promise<Goal> {
    await ensureAuthToken();
    return apiClient.post<Goal>(`/api/v1/goals/${id}/contribute`, { amount });
  },

  /**
   * Delete a goal
   */
  async deleteGoal(id: string): Promise<void> {
    await ensureAuthToken();
    await apiClient.delete(`/api/v1/goals/${id}`);
  },
};
