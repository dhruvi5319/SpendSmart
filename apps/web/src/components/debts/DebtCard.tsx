'use client';

import { useState } from 'react';
import { Calendar, ArrowDownLeft, ArrowUpRight, Trash2, Check, DollarSign } from 'lucide-react';
import { Button, Card, CardContent, Input } from '@/components/ui';
import { type Debt, debtsService } from '@/services/debts';
import { cn } from '@/lib/utils';

interface DebtCardProps {
  debt: Debt;
  onUpdate: () => void;
}

export function DebtCard({ debt, onUpdate }: DebtCardProps) {
  const [showPayment, setShowPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isSettling, setIsSettling] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isOwedToMe = debt.debt_type === 'owed_to_me';

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: debt.currency,
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

  const handleRecordPayment = async () => {
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) return;

    setIsRecording(true);
    try {
      await debtsService.recordPayment(debt.id, {
        amount,
        note: paymentNote || null,
        payment_date: new Date().toISOString().split('T')[0],
      });
      setPaymentAmount('');
      setPaymentNote('');
      setShowPayment(false);
      onUpdate();
    } catch (err) {
      console.error('Failed to record payment:', err);
    } finally {
      setIsRecording(false);
    }
  };

  const handleSettle = async () => {
    if (!confirm('Mark this debt as fully settled?')) return;

    setIsSettling(true);
    try {
      await debtsService.settleDebt(debt.id);
      onUpdate();
    } catch (err) {
      console.error('Failed to settle debt:', err);
    } finally {
      setIsSettling(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this debt?')) return;

    setIsDeleting(true);
    try {
      await debtsService.deleteDebt(debt.id);
      onUpdate();
    } catch (err) {
      console.error('Failed to delete debt:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const progressColor = debt.is_settled
    ? 'bg-green-500'
    : debt.is_overdue
    ? 'bg-red-500'
    : isOwedToMe
    ? 'bg-emerald-500'
    : 'bg-orange-500';

  return (
    <Card className={cn(debt.is_settled && 'opacity-75')}>
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-full',
                isOwedToMe ? 'bg-emerald-100' : 'bg-orange-100'
              )}
            >
              {isOwedToMe ? (
                <ArrowDownLeft className="h-5 w-5 text-emerald-600" />
              ) : (
                <ArrowUpRight className="h-5 w-5 text-orange-600" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{debt.person_name}</h3>
              <p className="text-sm text-gray-500">
                {isOwedToMe ? 'Owes you' : 'You owe'}
              </p>
            </div>
          </div>

          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        {/* Amount */}
        <div className="mt-4">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-sm text-gray-500">Remaining</p>
              <p className={cn(
                'text-2xl font-bold',
                isOwedToMe ? 'text-emerald-600' : 'text-orange-600'
              )}>
                {formatCurrency(debt.remaining_amount)}
              </p>
            </div>
            <p className="text-sm text-gray-500">
              of {formatCurrency(debt.original_amount)}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
            <div
              className={cn('h-full rounded-full transition-all', progressColor)}
              style={{ width: `${debt.progress_percentage}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">
            {debt.progress_percentage.toFixed(0)}% paid ({formatCurrency(debt.amount_paid)})
          </p>
        </div>

        {/* Description and dates */}
        {debt.description && (
          <p className="mt-3 text-sm text-gray-600">{debt.description}</p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {debt.is_settled && (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
              <Check className="h-3 w-3" />
              Settled
            </span>
          )}
          {debt.is_overdue && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
              Overdue
            </span>
          )}
          {debt.due_date && (
            <span className="inline-flex items-center gap-1 text-xs text-gray-500">
              <Calendar className="h-3 w-3" />
              Due {formatDate(debt.due_date)}
            </span>
          )}
        </div>

        {/* Payment History */}
        {debt.payments && debt.payments.length > 0 && (
          <div className="mt-4 border-t pt-4">
            <p className="text-xs font-medium text-gray-500 uppercase mb-2">Recent Payments</p>
            <div className="space-y-2 max-h-24 overflow-y-auto">
              {debt.payments.slice(0, 3).map((payment) => (
                <div key={payment.id} className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    {formatDate(payment.payment_date)}
                  </span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(payment.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        {!debt.is_settled && (
          <div className="mt-4">
            {showPayment ? (
              <div className="space-y-2">
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Payment amount"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                />
                <Input
                  placeholder="Note (optional)"
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={handleRecordPayment}
                    isLoading={isRecording}
                    disabled={!paymentAmount || parseFloat(paymentAmount) <= 0}
                  >
                    Record Payment
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setShowPayment(false);
                      setPaymentAmount('');
                      setPaymentNote('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setShowPayment(true)}
                >
                  <DollarSign className="mr-2 h-4 w-4" />
                  Record Payment
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSettle}
                  isLoading={isSettling}
                >
                  <Check className="mr-2 h-4 w-4" />
                  Settle
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
