'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import {
  ShoppingCart,
  Utensils,
  Car,
  Home,
  Film,
  Heart,
  GraduationCap,
  Briefcase,
  MoreHorizontal,
  Users,
  Zap,
  ShoppingBag,
  Plane,
  Tag,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { expensesService, type Expense, type NotablePurchasesResponse } from '@/services/expenses';

const iconMap: Record<string, typeof ShoppingCart> = {
  'shopping-cart': ShoppingCart,
  'utensils': Utensils,
  'car': Car,
  'home': Home,
  'film': Film,
  'heart': Heart,
  'graduation-cap': GraduationCap,
  'briefcase': Briefcase,
  'more-horizontal': MoreHorizontal,
  'zap': Zap,
  'shopping-bag': ShoppingBag,
  'plane': Plane,
  'tag': Tag,
};

interface ExpenseListProps {
  limit?: number;
  onEdit?: (expense: Expense) => void;
  refreshTrigger?: number;
}

export function ExpenseList({ limit, onEdit, refreshTrigger }: ExpenseListProps) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [notableIds, setNotableIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchExpenses = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Fetch expenses and notable purchases in parallel
        const [data, notable] = await Promise.all([
          expensesService.getExpenses(undefined, limit || 50),
          expensesService.getNotablePurchases(30).catch(() => null),
        ]);
        setExpenses(data);

        // Create a set of notable purchase IDs for quick lookup
        if (notable?.notable_purchases) {
          setNotableIds(new Set(notable.notable_purchases.map(p => p.id)));
        }
      } catch (err) {
        console.error('Failed to fetch expenses:', err);
        setError('Failed to load expenses. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchExpenses();
  }, [limit, refreshTrigger]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
        <span className="ml-2 text-gray-500">Loading expenses...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8 text-center text-red-500">
        <p>{error}</p>
      </div>
    );
  }

  if (expenses.length === 0) {
    return (
      <div className="py-8 text-center text-gray-500">
        <p>No expenses yet. Add your first expense!</p>
      </div>
    );
  }

  return (
    <div className="divide-y">
      {expenses.map((expense) => {
        const iconName = expense.category_icon || 'more-horizontal';
        const Icon = iconMap[iconName] || MoreHorizontal;
        const color = expense.category_color || '#6b7280';
        const isNotable = notableIds.has(expense.id);

        return (
          <div
            key={expense.id}
            className="flex items-center gap-3 sm:gap-4 py-3 sm:py-4 first:pt-0 last:pb-0 cursor-pointer hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors"
            onClick={() => onEdit?.(expense)}
          >
            <div
              className="shrink-0 rounded-full p-2"
              style={{ backgroundColor: `${color}20`, color: color }}
            >
              <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium text-gray-900 truncate text-sm sm:text-base">
                  {expense.description}
                </p>
                {isNotable && (
                  <span className="shrink-0 rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-medium text-purple-700">
                    Large
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-500 flex-wrap">
                <span className="truncate max-w-[80px] sm:max-w-none">{expense.category_name || 'Uncategorized'}</span>
                <span>•</span>
                <span>
                  {format(new Date(expense.expense_date), 'MMM d, yyyy')}
                </span>
                {expense.is_household && (
                  <>
                    <span className="hidden sm:inline">•</span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      <span className="hidden sm:inline">Shared</span> ({expense.household_size})
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="text-right shrink-0">
              <p className="font-semibold text-gray-900 text-sm sm:text-base">
                ${Number(expense.user_share).toFixed(2)}
              </p>
              {expense.is_household && expense.amount !== expense.user_share && (
                <p className="text-[10px] sm:text-xs text-gray-500">
                  of ${Number(expense.amount).toFixed(2)}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
