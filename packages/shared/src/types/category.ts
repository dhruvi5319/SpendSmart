export interface Category {
  id: string;
  user_id: string;
  name: string;
  icon: string | null;
  color: string | null;
  is_default: boolean;
  budget_amount: number | null;
  budget_currency: string;
}

export interface CategoryCreate {
  name: string;
  icon?: string;
  color?: string;
  budget_amount?: number;
  budget_currency?: string;
}

export interface CategoryUpdate {
  name?: string;
  icon?: string;
  color?: string;
  budget_amount?: number;
  budget_currency?: string;
}

export interface CategoryWithSpending extends Category {
  total_spent: number;
  expense_count: number;
  budget_remaining: number | null;
  budget_percentage: number | null;
}
