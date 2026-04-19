'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Select, Switch } from '@/components/ui';
import { type Bill, type BillFrequency, billsService } from '@/services/bills';

interface BillFormProps {
  bill?: Bill | null;
  onClose: () => void;
  onSuccess: () => void;
}

const frequencyOptions = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 Weeks' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
];

const iconOptions = ['💳', '🏠', '💡', '📱', '🚗', '🏥', '📺', '🌐', '🎵', '💪', '📰', '☁️'];

export function BillForm({ bill, onClose, onSuccess }: BillFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: bill?.name || '',
    description: bill?.description || '',
    amount: bill?.amount?.toString() || '',
    due_date: bill?.due_date?.split('T')[0] || new Date().toISOString().split('T')[0],
    frequency: (bill?.frequency || 'monthly') as BillFrequency,
    reminder_days: bill?.reminder_days?.toString() || '3',
    is_autopay: bill?.is_autopay || false,
    autopay_account: bill?.autopay_account || '',
    icon: bill?.icon || '💳',
    color: bill?.color || '#6366f1',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.amount || !formData.due_date) {
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: formData.name,
        description: formData.description || null,
        amount: parseFloat(formData.amount),
        due_date: formData.due_date,
        frequency: formData.frequency,
        reminder_days: parseInt(formData.reminder_days, 10),
        is_autopay: formData.is_autopay,
        autopay_account: formData.autopay_account || null,
        icon: formData.icon,
        color: formData.color,
      };

      if (bill) {
        await billsService.updateBill(bill.id, payload);
      } else {
        await billsService.createBill(payload);
      }

      onSuccess();
    } catch (err) {
      console.error('Failed to save bill:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{bill ? 'Edit Bill' : 'Add Bill'}</CardTitle>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Bill Name *
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Netflix, Rent, Electric"
                required
              />
            </div>

            {/* Amount and Due Date */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Amount *
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Due Date *
                </label>
                <Input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Frequency */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Frequency
              </label>
              <Select
                value={formData.frequency}
                onChange={(e) => setFormData({ ...formData, frequency: e.target.value as BillFrequency })}
              >
                {frequencyOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>

            {/* Description */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Description
              </label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional notes"
              />
            </div>

            {/* Reminder Days */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Remind me (days before)
              </label>
              <Input
                type="number"
                min="0"
                max="30"
                value={formData.reminder_days}
                onChange={(e) => setFormData({ ...formData, reminder_days: e.target.value })}
              />
            </div>

            {/* Auto-pay toggle */}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="font-medium text-gray-900">Auto-pay enabled</p>
                <p className="text-sm text-gray-500">Mark if this bill is paid automatically</p>
              </div>
              <Switch
                checked={formData.is_autopay}
                onChange={(checked) => setFormData({ ...formData, is_autopay: checked })}
              />
            </div>

            {/* Icon Selection */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Icon
              </label>
              <div className="flex flex-wrap gap-2">
                {iconOptions.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setFormData({ ...formData, icon })}
                    className={`flex h-10 w-10 items-center justify-center rounded-lg border-2 text-lg transition-colors ${
                      formData.icon === icon
                        ? 'border-primary-600 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            {/* Color Selection */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Color
              </label>
              <Input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="h-10 w-20 cursor-pointer"
              />
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
                {bill ? 'Save Changes' : 'Add Bill'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
