'use client';

import { useState } from 'react';
import { Calendar, Clock, CreditCard, Check, Pencil, Trash2, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button, Card, CardContent } from '@/components/ui';
import { type Bill, billsService } from '@/services/bills';
import { cn } from '@/lib/utils';

interface BillCardProps {
  bill: Bill;
  onUpdate: () => void;
  onEdit: (bill: Bill) => void;
}

export function BillCard({ bill, onUpdate, onEdit }: BillCardProps) {
  const [isMarkingPaid, setIsMarkingPaid] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: bill.currency,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const frequencyLabels: Record<string, string> = {
    weekly: 'Weekly',
    biweekly: 'Every 2 weeks',
    monthly: 'Monthly',
    quarterly: 'Quarterly',
    yearly: 'Yearly',
  };

  const handleMarkPaid = async () => {
    setIsMarkingPaid(true);
    try {
      await billsService.markBillPaid(bill.id);
      onUpdate();
    } catch (err) {
      console.error('Failed to mark bill as paid:', err);
    } finally {
      setIsMarkingPaid(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this bill?')) return;

    setIsDeleting(true);
    try {
      await billsService.deleteBill(bill.id);
      onUpdate();
    } catch (err) {
      console.error('Failed to delete bill:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusBadge = () => {
    if (bill.is_overdue) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
          <AlertTriangle className="h-3 w-3" />
          Overdue by {Math.abs(bill.days_until_due)} days
        </span>
      );
    }
    if (bill.days_until_due <= 3) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
          <Clock className="h-3 w-3" />
          Due in {bill.days_until_due} {bill.days_until_due === 1 ? 'day' : 'days'}
        </span>
      );
    }
    return null;
  };

  return (
    <Card className={cn(!bill.is_active && 'opacity-50')}>
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg text-lg"
              style={{ backgroundColor: bill.color ? `${bill.color}20` : '#e0e7ff' }}
            >
              {bill.icon || '💳'}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{bill.name}</h3>
              {bill.description && (
                <p className="text-sm text-gray-500">{bill.description}</p>
              )}
            </div>
          </div>

          <div className="flex gap-1">
            <button
              onClick={() => onEdit(bill)}
              className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Amount and Frequency */}
        <div className="mt-4 flex items-baseline justify-between">
          <span className="text-2xl font-bold text-gray-900">
            {formatCurrency(bill.amount)}
          </span>
          <span className="flex items-center gap-1 text-sm text-gray-500">
            <RefreshCw className="h-3 w-3" />
            {frequencyLabels[bill.frequency] || bill.frequency}
          </span>
        </div>

        {/* Due Date and Status */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 text-sm text-gray-600">
            <Calendar className="h-4 w-4" />
            Due {formatDate(bill.due_date)}
          </span>
          {getStatusBadge()}
          {bill.is_autopay && (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
              <CreditCard className="h-3 w-3" />
              Auto-pay
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="mt-4 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={handleMarkPaid}
            isLoading={isMarkingPaid}
          >
            <Check className="mr-2 h-4 w-4" />
            Mark Paid
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
