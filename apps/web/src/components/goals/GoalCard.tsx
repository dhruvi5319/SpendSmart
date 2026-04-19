'use client';

import { useState } from 'react';
import { Target, Calendar, Pencil, Trash2, Plus, Check, AlertTriangle } from 'lucide-react';
import { Button, Card, CardContent, Input } from '@/components/ui';
import { type Goal, goalsService } from '@/services/goals';
import { cn } from '@/lib/utils';

interface GoalCardProps {
  goal: Goal;
  onUpdate: () => void;
  onEdit: (goal: Goal) => void;
}

export function GoalCard({ goal, onUpdate, onEdit }: GoalCardProps) {
  const [showContribute, setShowContribute] = useState(false);
  const [contributeAmount, setContributeAmount] = useState('');
  const [isContributing, setIsContributing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: goal.currency,
    }).format(amount);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleContribute = async () => {
    const amount = parseFloat(contributeAmount);
    if (isNaN(amount) || amount <= 0) return;

    setIsContributing(true);
    try {
      await goalsService.contribute(goal.id, amount);
      setContributeAmount('');
      setShowContribute(false);
      onUpdate();
    } catch (err) {
      console.error('Failed to contribute:', err);
    } finally {
      setIsContributing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this goal?')) return;

    setIsDeleting(true);
    try {
      await goalsService.deleteGoal(goal.id);
      onUpdate();
    } catch (err) {
      console.error('Failed to delete goal:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const progressColor = goal.is_completed
    ? 'bg-green-500'
    : goal.is_overdue
    ? 'bg-red-500'
    : 'bg-primary-600';

  return (
    <Card className={cn(goal.is_completed && 'opacity-75')}>
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg text-lg"
              style={{ backgroundColor: goal.color ? `${goal.color}20` : '#e0e7ff' }}
            >
              {goal.icon || '🎯'}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{goal.name}</h3>
              {goal.description && (
                <p className="text-sm text-gray-500">{goal.description}</p>
              )}
            </div>
          </div>

          <div className="flex gap-1">
            {!goal.is_completed && (
              <button
                onClick={() => onEdit(goal)}
                className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <Pencil className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Progress */}
        <div className="mt-4">
          <div className="flex items-end justify-between text-sm">
            <span className="font-medium text-gray-700">
              {formatCurrency(goal.current_amount)}
            </span>
            <span className="text-gray-500">
              of {formatCurrency(goal.target_amount)}
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
            <div
              className={cn('h-full rounded-full transition-all', progressColor)}
              style={{ width: `${goal.progress_percentage}%` }}
            />
          </div>
          <div className="mt-1 flex justify-between text-xs text-gray-500">
            <span>{goal.progress_percentage.toFixed(1)}% complete</span>
            {goal.remaining_amount > 0 && (
              <span>{formatCurrency(goal.remaining_amount)} remaining</span>
            )}
          </div>
        </div>

        {/* Status badges */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {goal.is_completed && (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
              <Check className="h-3 w-3" />
              Completed
            </span>
          )}
          {goal.is_overdue && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
              <AlertTriangle className="h-3 w-3" />
              Overdue
            </span>
          )}
          {goal.deadline && (
            <span className="inline-flex items-center gap-1 text-xs text-gray-500">
              <Calendar className="h-3 w-3" />
              {formatDate(goal.deadline)}
            </span>
          )}
        </div>

        {/* Contribute section */}
        {!goal.is_completed && (
          <div className="mt-4">
            {showContribute ? (
              <div className="flex gap-2">
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Amount"
                  value={contributeAmount}
                  onChange={(e) => setContributeAmount(e.target.value)}
                  className="flex-1"
                />
                <Button
                  size="sm"
                  onClick={handleContribute}
                  isLoading={isContributing}
                  disabled={!contributeAmount || parseFloat(contributeAmount) <= 0}
                >
                  Add
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowContribute(false);
                    setContributeAmount('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setShowContribute(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Contribution
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
