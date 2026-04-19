import axios from 'axios';
import { supabase } from '@/lib/supabase';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export type DebtType = 'owed_to_me' | 'owed_by_me';

export interface DebtPayment {
  id: string;
  debt_id: string;
  amount: number;
  note: string | null;
  payment_date: string;
  created_at: string;
}

export interface Debt {
  id: string;
  user_id: string;
  person_name: string;
  description: string | null;
  original_amount: number;
  remaining_amount: number;
  currency: string;
  debt_type: DebtType;
  created_date: string;
  due_date: string | null;
  is_settled: boolean;
  settled_at: string | null;
  created_at: string;
  updated_at: string | null;
  // Computed fields
  amount_paid: number;
  progress_percentage: number;
  is_overdue: boolean;
  days_until_due: number | null;
  // Include payments history
  payments: DebtPayment[];
}

export interface DebtListResponse {
  debts: Debt[];
  total_count: number;
  owed_to_me_count: number;
  owed_by_me_count: number;
  total_owed_to_me: number;
  total_owed_by_me: number;
  net_balance: number;
}

export interface PersonSummary {
  person_name: string;
  total_owed_to_me: number;
  total_owed_by_me: number;
  net_balance: number;
  debt_count: number;
  oldest_debt_date: string | null;
}

export interface DebtSummaryResponse {
  by_person: PersonSummary[];
  total_owed_to_me: number;
  total_owed_by_me: number;
  net_balance: number;
}

export interface CreateDebtInput {
  person_name: string;
  description?: string | null;
  original_amount: number;
  currency?: string;
  debt_type: DebtType;
  created_date: string;
  due_date?: string | null;
}

export interface UpdateDebtInput {
  person_name?: string;
  description?: string | null;
  due_date?: string | null;
}

export interface CreatePaymentInput {
  amount: number;
  note?: string | null;
  payment_date: string;
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

export const debtsService = {
  /**
   * Get all debts for the current user
   */
  async getDebts(includeSettled = false, debtType?: DebtType): Promise<DebtListResponse> {
    const params = new URLSearchParams();
    if (includeSettled) params.append('include_settled', 'true');
    if (debtType) params.append('debt_type', debtType);
    return apiGet<DebtListResponse>(`/api/v1/debts?${params.toString()}`);
  },

  /**
   * Get debt summary grouped by person
   */
  async getDebtSummary(): Promise<DebtSummaryResponse> {
    return apiGet<DebtSummaryResponse>('/api/v1/debts/summary');
  },

  /**
   * Get a single debt by ID
   */
  async getDebt(id: string): Promise<Debt | null> {
    try {
      return await apiGet<Debt>(`/api/v1/debts/${id}`);
    } catch (error) {
      console.error('Error fetching debt:', error);
      return null;
    }
  },

  /**
   * Create a new debt
   */
  async createDebt(input: CreateDebtInput): Promise<Debt> {
    return apiPost<Debt>('/api/v1/debts', input);
  },

  /**
   * Update a debt
   */
  async updateDebt(id: string, input: UpdateDebtInput): Promise<Debt> {
    return apiPut<Debt>(`/api/v1/debts/${id}`, input);
  },

  /**
   * Record a payment on a debt
   */
  async recordPayment(id: string, input: CreatePaymentInput): Promise<Debt> {
    return apiPost<Debt>(`/api/v1/debts/${id}/payment`, input);
  },

  /**
   * Mark a debt as fully settled
   */
  async settleDebt(id: string): Promise<Debt> {
    return apiPost<Debt>(`/api/v1/debts/${id}/settle`);
  },

  /**
   * Delete a debt
   */
  async deleteDebt(id: string): Promise<void> {
    await apiDelete(`/api/v1/debts/${id}`);
  },
};
