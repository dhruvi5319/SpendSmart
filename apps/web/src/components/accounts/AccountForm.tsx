'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Input, Select, Button } from '@/components/ui';
import {
  type Account,
  type AccountType,
  type CreateAccountInput,
  type UpdateAccountInput,
  accountTypeInfo,
  accountsService,
} from '@/services/accounts';

interface AccountFormProps {
  account?: Account | null;
  onSave: () => void;
  onCancel: () => void;
}

const accountTypeOptions = Object.entries(accountTypeInfo).map(([value, info]) => ({
  value,
  label: `${info.icon} ${info.label}`,
}));

const currencyOptions = [
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'INR', label: 'INR - Indian Rupee' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'GBP', label: 'GBP - British Pound' },
];

export function AccountForm({ account, onSave, onCancel }: AccountFormProps) {
  const isEditing = !!account;

  const [formData, setFormData] = useState<CreateAccountInput>({
    name: account?.name || '',
    type: account?.type || 'checking',
    balance: account?.balance || 0,
    currency: account?.currency || 'USD',
    institution: account?.institution || '',
    is_asset: account?.is_asset ?? accountTypeInfo[account?.type || 'checking'].isAsset,
    notes: account?.notes || '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleTypeChange = (newType: AccountType) => {
    setFormData({
      ...formData,
      type: newType,
      is_asset: accountTypeInfo[newType].isAsset,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      if (isEditing) {
        const updateData: UpdateAccountInput = {
          name: formData.name,
          type: formData.type,
          balance: formData.balance,
          currency: formData.currency,
          institution: formData.institution || null,
          is_asset: formData.is_asset,
          notes: formData.notes || null,
        };
        await accountsService.updateAccount(account.id, updateData);
      } else {
        await accountsService.createAccount(formData);
      }
      onSave();
    } catch (err) {
      console.error('Failed to save account:', err);
      setError('Failed to save account. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{isEditing ? 'Edit Account' : 'Add Account'}</CardTitle>
          <button
            onClick={onCancel}
            className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            {/* Account Name */}
            <Input
              label="Account Name"
              placeholder="e.g., Chase Checking, Savings, Amex Gold"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />

            {/* Account Type */}
            <Select
              label="Account Type"
              value={formData.type}
              onChange={(e) => handleTypeChange(e.target.value as AccountType)}
              options={accountTypeOptions}
            />

            {/* Balance */}
            <div>
              <Input
                label={formData.is_asset ? 'Current Balance' : 'Current Balance Owed'}
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.balance}
                onChange={(e) =>
                  setFormData({ ...formData, balance: parseFloat(e.target.value) || 0 })
                }
                required
              />
              {formData.type === 'credit_card' && (
                <p className="mt-1 text-xs text-gray-500">
                  Enter the amount you currently owe on this card (not the credit limit)
                </p>
              )}
            </div>

            {/* Currency */}
            <Select
              label="Currency"
              value={formData.currency}
              onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              options={currencyOptions}
            />

            {/* Institution */}
            <Input
              label="Institution (optional)"
              placeholder="e.g., Chase Bank, Fidelity, Amex"
              value={formData.institution || ''}
              onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
            />

            {/* Notes */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Notes (optional)
              </label>
              <textarea
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                rows={2}
                placeholder="Any additional notes..."
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>

            {/* Asset/Liability Toggle */}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="font-medium text-gray-900">
                  {formData.is_asset ? 'This is an Asset' : 'This is a Liability'}
                </p>
                <p className="text-sm text-gray-500">
                  {formData.is_asset
                    ? 'Money you have (counts as +)'
                    : 'Money you owe (counts as -)'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, is_asset: !formData.is_asset })}
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  formData.is_asset ? 'bg-emerald-500' : 'bg-orange-500'
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    formData.is_asset ? 'left-0.5' : 'left-5'
                  }`}
                />
              </button>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={onCancel}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !formData.name}
                className="flex-1"
              >
                {isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Account'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
