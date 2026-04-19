import axios from 'axios';
import { supabase } from '@/lib/supabase';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export type BillFrequency = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';

export interface Bill {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  amount: number;
  currency: string;
  due_date: string;
  frequency: BillFrequency;
  reminder_days: number;
  is_autopay: boolean;
  autopay_account: string | null;
  category_id: string | null;
  icon: string | null;
  color: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
  // Computed fields
  days_until_due: number;
  is_overdue: boolean;
  next_occurrence: string;
}

export interface BillListResponse {
  bills: Bill[];
  total_count: number;
  active_count: number;
  total_monthly_amount: number;
  upcoming_this_week: number;
  overdue_count: number;
}

export interface CreateBillInput {
  name: string;
  description?: string | null;
  amount: number;
  currency?: string;
  due_date: string;
  frequency: BillFrequency;
  reminder_days?: number;
  is_autopay?: boolean;
  autopay_account?: string | null;
  category_id?: string | null;
  icon?: string | null;
  color?: string | null;
}

export interface UpdateBillInput {
  name?: string;
  description?: string | null;
  amount?: number;
  currency?: string;
  due_date?: string;
  frequency?: BillFrequency;
  reminder_days?: number;
  is_autopay?: boolean;
  autopay_account?: string | null;
  category_id?: string | null;
  icon?: string | null;
  color?: string | null;
  is_active?: boolean;
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

export const billsService = {
  /**
   * Get all bills for the current user
   */
  async getBills(includeInactive = false): Promise<BillListResponse> {
    const params = new URLSearchParams();
    if (includeInactive) params.append('include_inactive', 'true');
    return apiGet<BillListResponse>(`/api/v1/bills?${params.toString()}`);
  },

  /**
   * Get upcoming bills within the next N days
   */
  async getUpcomingBills(daysAhead = 30): Promise<Bill[]> {
    return apiGet<Bill[]>(`/api/v1/bills/upcoming?days_ahead=${daysAhead}`);
  },

  /**
   * Get overdue bills
   */
  async getOverdueBills(): Promise<Bill[]> {
    return apiGet<Bill[]>('/api/v1/bills/overdue');
  },

  /**
   * Get a single bill by ID
   */
  async getBill(id: string): Promise<Bill | null> {
    try {
      return await apiGet<Bill>(`/api/v1/bills/${id}`);
    } catch (error) {
      console.error('Error fetching bill:', error);
      return null;
    }
  },

  /**
   * Create a new bill
   */
  async createBill(input: CreateBillInput): Promise<Bill> {
    return apiPost<Bill>('/api/v1/bills', input);
  },

  /**
   * Update a bill
   */
  async updateBill(id: string, input: UpdateBillInput): Promise<Bill> {
    return apiPut<Bill>(`/api/v1/bills/${id}`, input);
  },

  /**
   * Mark a bill as paid and advance to next due date
   */
  async markBillPaid(id: string): Promise<Bill> {
    return apiPost<Bill>(`/api/v1/bills/${id}/pay`);
  },

  /**
   * Delete a bill
   */
  async deleteBill(id: string): Promise<void> {
    await apiDelete(`/api/v1/bills/${id}`);
  },
};
