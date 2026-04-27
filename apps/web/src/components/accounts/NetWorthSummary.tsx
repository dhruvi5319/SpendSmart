'use client';

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Wallet, PiggyBank, CreditCard } from 'lucide-react';
import { Card, CardContent } from '@/components/ui';
import { type AccountSummary } from '@/services/accounts';
import { cn } from '@/lib/utils';

interface NetWorthSummaryProps {
  summary: AccountSummary;
}

export function NetWorthSummary({ summary }: NetWorthSummaryProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const isPositiveNetWorth = summary.net_worth >= 0;

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {/* Net Worth */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card
          className={cn(
            'border-2',
            isPositiveNetWorth ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'
          )}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'rounded-lg p-2',
                  isPositiveNetWorth ? 'bg-emerald-100' : 'bg-red-100'
                )}
              >
                <Wallet
                  className={cn(
                    'h-5 w-5',
                    isPositiveNetWorth ? 'text-emerald-600' : 'text-red-600'
                  )}
                />
              </div>
              <span className="text-sm font-medium text-gray-600">Net Worth</span>
            </div>
            <p
              className={cn(
                'mt-2 text-2xl font-bold',
                isPositiveNetWorth ? 'text-emerald-700' : 'text-red-700'
              )}
            >
              {formatCurrency(summary.net_worth)}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              {summary.accounts_count} account{summary.accounts_count !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Total Assets */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-blue-100 p-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
              <span className="text-sm font-medium text-gray-600">Total Assets</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900">
              {formatCurrency(summary.total_assets)}
            </p>
            <p className="mt-1 text-xs text-gray-500">Money you have</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Total Liabilities */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-orange-100 p-2">
                <TrendingDown className="h-5 w-5 text-orange-600" />
              </div>
              <span className="text-sm font-medium text-gray-600">Total Liabilities</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-orange-600">
              {formatCurrency(summary.total_liabilities)}
            </p>
            <p className="mt-1 text-xs text-gray-500">Money you owe</p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
