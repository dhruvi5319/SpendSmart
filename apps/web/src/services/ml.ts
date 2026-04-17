import { apiClient } from '@spendsmart/shared';
import { supabase } from '@/lib/supabase';

export interface CategoryPrediction {
  category: string;
  confidence: number;
}

export interface CategoryPredictionResponse {
  description: string;
  predicted_category: string;
  confidence: number;
  top_predictions: CategoryPrediction[];
  category_id: string | null;
}

export interface MLModelStatus {
  is_loaded: boolean;
  model_path: string;
  model_exists: boolean;
  categories: string[];
  training_examples: number;
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

export const mlService = {
  /**
   * Predict category for an expense description
   */
  async categorize(description: string): Promise<CategoryPredictionResponse> {
    await ensureAuthToken();
    return apiClient.post<CategoryPredictionResponse>('/api/v1/ml/categorize', {
      description,
    });
  },

  /**
   * Predict categories for multiple descriptions at once
   */
  async categorizeBatch(descriptions: string[]): Promise<{ predictions: CategoryPredictionResponse[] }> {
    await ensureAuthToken();
    return apiClient.post<{ predictions: CategoryPredictionResponse[] }>('/api/v1/ml/categorize/batch', {
      descriptions,
    });
  },

  /**
   * Get ML model status
   */
  async getStatus(): Promise<MLModelStatus> {
    await ensureAuthToken();
    return apiClient.get<MLModelStatus>('/api/v1/ml/status');
  },

  /**
   * Retrain the ML model (admin only)
   */
  async retrain(): Promise<{ status: string; message: string }> {
    await ensureAuthToken();
    return apiClient.post<{ status: string; message: string }>('/api/v1/ml/retrain');
  },
};
