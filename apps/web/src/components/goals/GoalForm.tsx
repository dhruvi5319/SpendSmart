'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input } from '@/components/ui';
import { goalsService, type Goal, type CreateGoalInput } from '@/services/goals';

const goalSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  description: z.string().optional(),
  target_amount: z.number().positive('Target must be positive'),
  current_amount: z.number().min(0, 'Amount cannot be negative').optional(),
  deadline: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
});

type GoalFormData = z.infer<typeof goalSchema>;

interface GoalFormProps {
  goal?: Goal;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const ICON_OPTIONS = ['🎯', '💰', '🏠', '🚗', '✈️', '📱', '💻', '🎓', '💍', '🏦'];
const COLOR_OPTIONS = ['#4F46E5', '#059669', '#DC2626', '#D97706', '#7C3AED', '#DB2777'];

export function GoalForm({ goal, onSuccess, onCancel }: GoalFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIcon, setSelectedIcon] = useState(goal?.icon || '🎯');
  const [selectedColor, setSelectedColor] = useState(goal?.color || '#4F46E5');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<GoalFormData>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      name: goal?.name || '',
      description: goal?.description || '',
      target_amount: goal ? Number(goal.target_amount) : undefined,
      current_amount: goal ? Number(goal.current_amount) : 0,
      deadline: goal?.deadline || '',
    },
  });

  const handleFormSubmit = async (data: GoalFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const input: CreateGoalInput = {
        name: data.name,
        description: data.description || undefined,
        target_amount: data.target_amount,
        current_amount: data.current_amount,
        deadline: data.deadline || undefined,
        icon: selectedIcon,
        color: selectedColor,
      };

      if (goal) {
        await goalsService.updateGoal(goal.id, input);
      } else {
        await goalsService.createGoal(input);
      }

      onSuccess?.();
    } catch (err) {
      console.error('Failed to save goal:', err);
      setError('Failed to save goal. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <Input
        label="Goal Name"
        placeholder="e.g., Emergency Fund"
        error={errors.name?.message}
        {...register('name')}
      />

      <Input
        label="Description (optional)"
        placeholder="What are you saving for?"
        {...register('description')}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Target Amount"
          type="number"
          step="0.01"
          placeholder="0.00"
          error={errors.target_amount?.message}
          {...register('target_amount', { valueAsNumber: true })}
        />

        <Input
          label="Current Amount"
          type="number"
          step="0.01"
          placeholder="0.00"
          error={errors.current_amount?.message}
          {...register('current_amount', { valueAsNumber: true })}
        />
      </div>

      <Input
        label="Target Date (optional)"
        type="date"
        {...register('deadline')}
      />

      {/* Icon picker */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          Icon
        </label>
        <div className="flex flex-wrap gap-2">
          {ICON_OPTIONS.map((icon) => (
            <button
              key={icon}
              type="button"
              onClick={() => setSelectedIcon(icon)}
              className={`flex h-10 w-10 items-center justify-center rounded-lg border-2 text-lg transition-colors ${
                selectedIcon === icon
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {icon}
            </button>
          ))}
        </div>
      </div>

      {/* Color picker */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          Color
        </label>
        <div className="flex gap-2">
          {COLOR_OPTIONS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => setSelectedColor(color)}
              className={`h-8 w-8 rounded-full transition-transform ${
                selectedColor === color ? 'scale-110 ring-2 ring-offset-2' : ''
              }`}
              style={{ backgroundColor: color, ['--tw-ring-color' as string]: color }}
            />
          ))}
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
        )}
        <Button type="submit" isLoading={isSubmitting} className="flex-1">
          {goal ? 'Update Goal' : 'Create Goal'}
        </Button>
      </div>
    </form>
  );
}
