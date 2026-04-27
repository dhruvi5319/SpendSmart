import { apiClient } from '@spendsmart/shared';
import { supabase } from '@/lib/supabase';

export type AccountType =
  | 'checking'
  | 'savings'
  | 'investment'
  | 'loan'
  | 'mortgage'
  | 'credit_card'
  | 'cash'
  | 'other';

export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: AccountType;
  balance: number;
  currency: string;
  institution: string | null;
  is_asset: boolean;
  notes: string | null;
  last_updated: string | null;
  created_at: string;
}

export interface CreateAccountInput {
  name: string;
  type: AccountType;
  balance?: number;
  currency?: string;
  institution?: string | null;
  is_asset?: boolean;
  notes?: string | null;
}

export interface UpdateAccountInput {
  name?: string;
  type?: AccountType;
  balance?: number;
  currency?: string;
  institution?: string | null;
  is_asset?: boolean;
  notes?: string | null;
}

export interface AccountSummary {
  total_assets: number;
  total_liabilities: number;
  net_worth: number;
  accounts_count: number;
  by_type: Record<string, number>;
}

async function ensureAuthToken(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    apiClient.setToken(session.access_token);
  } else {
    throw new Error('User not authenticated');
  }
}

export const accountsService = {
  /**
   * Get all accounts for the current user
   */
  async getAccounts(): Promise<Account[]> {
    await ensureAuthToken();
    return apiClient.get<Account[]>('/api/v1/accounts/');
  },

  /**
   * Get account summary with net worth calculation
   */
  async getSummary(): Promise<AccountSummary> {
    await ensureAuthToken();
    return apiClient.get<AccountSummary>('/api/v1/accounts/summary');
  },

  /**
   * Get a single account by ID
   */
  async getAccount(accountId: string): Promise<Account> {
    await ensureAuthToken();
    return apiClient.get<Account>(`/api/v1/accounts/${accountId}`);
  },

  /**
   * Create a new account
   */
  async createAccount(data: CreateAccountInput): Promise<Account> {
    await ensureAuthToken();
    return apiClient.post<Account>('/api/v1/accounts/', data);
  },

  /**
   * Update an existing account
   */
  async updateAccount(accountId: string, data: UpdateAccountInput): Promise<Account> {
    await ensureAuthToken();
    return apiClient.patch<Account>(`/api/v1/accounts/${accountId}`, data);
  },

  /**
   * Quick update for just the account balance
   */
  async updateBalance(accountId: string, balance: number): Promise<Account> {
    await ensureAuthToken();
    return apiClient.patch<Account>(`/api/v1/accounts/${accountId}/balance?balance=${balance}`, {});
  },

  /**
   * Delete an account
   */
  async deleteAccount(accountId: string): Promise<void> {
    await ensureAuthToken();
    return apiClient.delete(`/api/v1/accounts/${accountId}`);
  },
};

/**
 * Helper to get display info for account types
 */
export const accountTypeInfo: Record<AccountType, { label: string; icon: string; isAsset: boolean }> = {
  checking: { label: 'Checking Account', icon: '🏦', isAsset: true },
  savings: { label: 'Savings Account', icon: '💰', isAsset: true },
  investment: { label: 'Investment Account', icon: '📈', isAsset: true },
  cash: { label: 'Cash', icon: '💵', isAsset: true },
  credit_card: { label: 'Credit Card', icon: '💳', isAsset: false },
  loan: { label: 'Loan', icon: '📋', isAsset: false },
  mortgage: { label: 'Mortgage', icon: '🏠', isAsset: false },
  other: { label: 'Other', icon: '📦', isAsset: true },
};
