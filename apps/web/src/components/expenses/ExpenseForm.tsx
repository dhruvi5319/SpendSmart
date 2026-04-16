'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input, Select, Switch } from '@/components/ui';
import { categoriesService, type Category } from '@/services/categories';
import { expensesService, type Expense, type CreateExpenseInput } from '@/services/expenses';

const expenseSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  category_id: z.string().optional(),
  description: z.string().min(1, 'Description is required'),
  expense_date: z.string().min(1, 'Date is required'),
  is_household: z.boolean(),
  household_size: z.number().min(1).max(10).optional(),
  is_recurring: z.boolean(),
  notes: z.string().optional(),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

interface ExpenseFormProps {
  expense?: Expense;
  onSuccess?: (expense: Expense) => void;
  onCancel?: () => void;
}

export function ExpenseForm({ expense, onSuccess, onCancel }: ExpenseFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Fetch categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await categoriesService.getCategories();
        setCategories(data);
      } catch (err) {
        console.error('Failed to fetch categories:', err);
      }
    };
    fetchCategories();
  }, []);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      amount: expense?.amount ? Number(expense.amount) : undefined,
      category_id: expense?.category_id || '',
      description: expense?.description || '',
      expense_date: expense?.expense_date
        ? new Date(expense.expense_date).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
      is_household: expense?.is_household || false,
      household_size: expense?.household_size || 2,
      is_recurring: expense?.is_recurring || false,
      notes: expense?.notes || '',
    },
  });

  const isHousehold = watch('is_household');

  const handleFormSubmit = async (data: ExpenseFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const input: CreateExpenseInput = {
        amount: data.amount,
        category_id: data.category_id || null,
        description: data.description,
        expense_date: data.expense_date,
        is_household: data.is_household,
        household_size: data.is_household ? data.household_size : 1,
        is_recurring: data.is_recurring,
        notes: data.notes,
      };

      let savedExpense: Expense;

      if (expense) {
        // Update existing expense
        savedExpense = await expensesService.updateExpense(expense.id, input);
      } else {
        // Create new expense
        savedExpense = await expensesService.createExpense(input);
      }

      onSuccess?.(savedExpense);
    } catch (err) {
      console.error('Failed to save expense:', err);
      setError('Failed to save expense. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Convert categories to select options
  const categoryOptions = categories.map((cat) => ({
    value: cat.id,
    label: cat.name,
  }));

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Amount"
          type="number"
          step="0.01"
          placeholder="0.00"
          error={errors.amount?.message}
          {...register('amount', { valueAsNumber: true })}
        />

        <Select
          label="Category"
          options={[{ value: '', label: 'Select category' }, ...categoryOptions]}
          error={errors.category_id?.message}
          {...register('category_id')}
        />
      </div>

      <Input
        label="Description"
        placeholder="What did you spend on?"
        error={errors.description?.message}
        {...register('description')}
      />

      <Input
        label="Date"
        type="date"
        error={errors.expense_date?.message}
        {...register('expense_date')}
      />

      <Input
        label="Notes (optional)"
        placeholder="Additional notes..."
        {...register('notes')}
      />

      <div className="space-y-4 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-900">Household Expense</p>
            <p className="text-sm text-gray-500">
              Split this expense among household members
            </p>
          </div>
          <Switch
            checked={isHousehold}
            onCheckedChange={(checked) => setValue('is_household', checked)}
          />
        </div>

        {isHousehold && (
          <Input
            label="Household Size"
            type="number"
            min={1}
            max={10}
            error={errors.household_size?.message}
            {...register('household_size', { valueAsNumber: true })}
          />
        )}
      </div>

      <div className="flex items-center justify-between rounded-lg border p-4">
        <div>
          <p className="font-medium text-gray-900">Recurring Expense</p>
          <p className="text-sm text-gray-500">This expense repeats regularly</p>
        </div>
        <Switch
          checked={watch('is_recurring')}
          onCheckedChange={(checked) => setValue('is_recurring', checked)}
        />
      </div>

      <div className="flex gap-3 pt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
        )}
        <Button type="submit" isLoading={isSubmitting} className="flex-1">
          {expense ? 'Update Expense' : 'Add Expense'}
        </Button>
      </div>
    </form>
  );
}
