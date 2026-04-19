'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Calendar, Pencil, Trash2, Plus, Check, AlertTriangle, Sparkles } from 'lucide-react';
import { Button, Card, CardContent, Input } from '@/components/ui';
import { type Goal, goalsService } from '@/services/goals';
import { cn } from '@/lib/utils';
import { AnimatedProgressRing } from './AnimatedProgressRing';

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
    ? '#10b981' // green
    : goal.is_overdue
    ? '#ef4444' // red
    : goal.color || '#6366f1'; // primary or custom color

  const progressBarColor = goal.is_completed
    ? 'bg-green-500'
    : goal.is_overdue
    ? 'bg-red-500'
    : 'bg-primary-600';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={cn(goal.is_completed && 'opacity-75', 'overflow-hidden')}>
        <CardContent className="p-6">
          {/* Celebration effect for completed goals */}
          <AnimatePresence>
            {goal.is_completed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute -right-4 -top-4"
              >
                <Sparkles className="h-8 w-8 text-yellow-400" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Header with animated ring */}
          <div className="flex items-start gap-4">
            {/* Animated Progress Ring */}
            <AnimatedProgressRing
              progress={goal.progress_percentage}
              size={80}
              strokeWidth={6}
              color={progressColor}
              showPercentage={true}
              showCheckmark={goal.is_completed}
            />

            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{goal.icon || '🎯'}</span>
                    <h3 className="font-semibold text-gray-900">{goal.name}</h3>
                  </div>
                  {goal.description && (
                    <p className="mt-1 text-sm text-gray-500">{goal.description}</p>
                  )}
                </div>

                <div className="flex gap-1">
                  {!goal.is_completed && (
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => onEdit(goal)}
                      className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    >
                      <Pencil className="h-4 w-4" />
                    </motion.button>
                  )}
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </motion.button>
                </div>
              </div>

              {/* Amount details */}
              <div className="mt-3">
                <div className="flex items-baseline gap-2">
                  <motion.span
                    key={goal.current_amount}
                    initial={{ scale: 1.2, color: progressColor }}
                    animate={{ scale: 1, color: '#374151' }}
                    className="text-lg font-bold text-gray-700"
                  >
                    {formatCurrency(goal.current_amount)}
                  </motion.span>
                  <span className="text-sm text-gray-500">
                    of {formatCurrency(goal.target_amount)}
                  </span>
                </div>
                {goal.remaining_amount > 0 && (
                  <p className="mt-1 text-xs text-gray-500">
                    {formatCurrency(goal.remaining_amount)} remaining
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Animated progress bar */}
          <div className="mt-4">
            <div className="h-2 overflow-hidden rounded-full bg-gray-100">
              <motion.div
                className={cn('h-full rounded-full', progressBarColor)}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(goal.progress_percentage, 100)}%` }}
                transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
              />
            </div>
          </div>

          {/* Status badges */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <AnimatePresence>
              {goal.is_completed && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700"
                >
                  <Check className="h-3 w-3" />
                  Completed
                </motion.span>
              )}
              {goal.is_overdue && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700"
                >
                  <AlertTriangle className="h-3 w-3" />
                  Overdue
                </motion.span>
              )}
            </AnimatePresence>
            {goal.target_date && (
              <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                <Calendar className="h-3 w-3" />
                {formatDate(goal.target_date)}
              </span>
            )}
          </div>

          {/* Contribute section */}
          {!goal.is_completed && (
            <div className="mt-4">
              <AnimatePresence mode="wait">
                {showContribute ? (
                  <motion.div
                    key="contribute-form"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex gap-2"
                  >
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Amount"
                      value={contributeAmount}
                      onChange={(e) => setContributeAmount(e.target.value)}
                      className="flex-1"
                      autoFocus
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
                  </motion.div>
                ) : (
                  <motion.div
                    key="contribute-button"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => setShowContribute(true)}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Contribution
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
