'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { MoreVertical, Pencil, Trash2, TrendingUp, TrendingDown, Building2 } from 'lucide-react';
import { Card, CardContent, Button } from '@/components/ui';
import { type Account, accountTypeInfo, accountsService } from '@/services/accounts';
import { cn } from '@/lib/utils';

interface AccountCardProps {
  account: Account;
  onEdit: (account: Account) => void;
  onDelete: () => void;
}

export function AccountCard({ account, onEdit, onDelete }: AccountCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const typeInfo = accountTypeInfo[account.type] || accountTypeInfo.other;
  const isPositive = account.balance >= 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: account.currency || 'USD',
      minimumFractionDigits: 2,
    }).format(Math.abs(value));
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${account.name}"?`)) return;

    setIsDeleting(true);
    try {
      await accountsService.deleteAccount(account.id);
      onDelete();
    } catch (err) {
      console.error('Failed to delete account:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card className="relative overflow-hidden">
        {/* Asset/Liability indicator bar */}
        <div
          className={cn(
            'absolute left-0 top-0 h-full w-1',
            account.is_asset ? 'bg-emerald-500' : 'bg-orange-500'
          )}
        />

        <CardContent className="p-4 pl-5">
          <div className="flex items-start justify-between">
            {/* Account Info */}
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  'flex h-12 w-12 items-center justify-center rounded-xl text-2xl',
                  account.is_asset ? 'bg-emerald-100' : 'bg-orange-100'
                )}
              >
                {typeInfo.icon}
              </div>

              <div>
                <h3 className="font-semibold text-gray-900">{account.name}</h3>
                <p className="text-sm text-gray-500">{typeInfo.label}</p>
                {account.institution && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-gray-400">
                    <Building2 className="h-3 w-3" />
                    {account.institution}
                  </p>
                )}
              </div>
            </div>

            {/* Menu */}
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <MoreVertical className="h-5 w-5" />
              </button>

              {showMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowMenu(false)}
                  />
                  <div className="absolute right-0 z-20 mt-1 w-36 rounded-lg border bg-white py-1 shadow-lg">
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        onEdit(account);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <Pencil className="h-4 w-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        handleDelete();
                      }}
                      disabled={isDeleting}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      {isDeleting ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Balance */}
          <div className="mt-4 flex items-end justify-between">
            <div>
              <p className="text-xs text-gray-500">
                {account.is_asset ? 'Balance' : 'Amount Owed'}
              </p>
              <p
                className={cn(
                  'text-2xl font-bold',
                  account.is_asset
                    ? 'text-gray-900'
                    : 'text-orange-600'
                )}
              >
                {!account.is_asset && '-'}
                {formatCurrency(account.balance)}
              </p>
            </div>

            <div
              className={cn(
                'flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium',
                account.is_asset
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-orange-100 text-orange-700'
              )}
            >
              {account.is_asset ? (
                <>
                  <TrendingUp className="h-3 w-3" />
                  Asset
                </>
              ) : (
                <>
                  <TrendingDown className="h-3 w-3" />
                  Liability
                </>
              )}
            </div>
          </div>

          {/* Notes */}
          {account.notes && (
            <p className="mt-3 text-sm text-gray-500 border-t pt-3">
              {account.notes}
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
