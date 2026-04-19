'use client';

import { useState } from 'react';
import { X, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@/components/ui';
import { type DebtType, debtsService } from '@/services/debts';
import { cn } from '@/lib/utils';

interface DebtFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function DebtForm({ onClose, onSuccess }: DebtFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    person_name: '',
    description: '',
    original_amount: '',
    debt_type: 'owed_to_me' as DebtType,
    created_date: new Date().toISOString().split('T')[0],
    due_date: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.person_name || !formData.original_amount) {
      return;
    }

    setIsSubmitting(true);
    try {
      await debtsService.createDebt({
        person_name: formData.person_name,
        description: formData.description || null,
        original_amount: parseFloat(formData.original_amount),
        debt_type: formData.debt_type,
        created_date: formData.created_date,
        due_date: formData.due_date || null,
      });

      onSuccess();
    } catch (err) {
      console.error('Failed to create debt:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Add Debt</CardTitle>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Debt Type Selection */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, debt_type: 'owed_to_me' })}
                  className={cn(
                    'flex items-center justify-center gap-2 rounded-lg border-2 p-3 transition-colors',
                    formData.debt_type === 'owed_to_me'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <ArrowDownLeft className="h-5 w-5" />
                  <span className="font-medium">Someone owes me</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, debt_type: 'owed_by_me' })}
                  className={cn(
                    'flex items-center justify-center gap-2 rounded-lg border-2 p-3 transition-colors',
                    formData.debt_type === 'owed_by_me'
                      ? 'border-orange-500 bg-orange-50 text-orange-700'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <ArrowUpRight className="h-5 w-5" />
                  <span className="font-medium">I owe someone</span>
                </button>
              </div>
            </div>

            {/* Person Name */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                {formData.debt_type === 'owed_to_me' ? 'Who owes you?' : 'Who do you owe?'} *
              </label>
              <Input
                value={formData.person_name}
                onChange={(e) => setFormData({ ...formData, person_name: e.target.value })}
                placeholder="Enter name"
                required
              />
            </div>

            {/* Amount */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Amount *
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.original_amount}
                onChange={(e) => setFormData({ ...formData, original_amount: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                What for?
              </label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="e.g., Dinner, Loan, Tickets"
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Date Created
                </label>
                <Input
                  type="date"
                  value={formData.created_date}
                  onChange={(e) => setFormData({ ...formData, created_date: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Due Date (optional)
                </label>
                <Input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                />
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" isLoading={isSubmitting}>
                Add Debt
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
