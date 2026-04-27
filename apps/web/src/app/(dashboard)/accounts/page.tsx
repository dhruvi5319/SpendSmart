'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Wallet, RefreshCw } from 'lucide-react';
import { Button, Card, CardContent } from '@/components/ui';
import { AccountCard } from '@/components/accounts/AccountCard';
import { AccountForm } from '@/components/accounts/AccountForm';
import { NetWorthSummary } from '@/components/accounts/NetWorthSummary';
import {
  type Account,
  type AccountSummary,
  accountsService,
} from '@/services/accounts';

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [summary, setSummary] = useState<AccountSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError('');
      const [accountsData, summaryData] = await Promise.all([
        accountsService.getAccounts(),
        accountsService.getSummary(),
      ]);
      setAccounts(accountsData);
      setSummary(summaryData);
    } catch (err) {
      console.error('Failed to fetch accounts:', err);
      setError('Failed to load accounts. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = () => {
    setShowForm(false);
    setEditingAccount(null);
    fetchData();
  };

  const handleEdit = (account: Account) => {
    setEditingAccount(account);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingAccount(null);
  };

  // Separate assets and liabilities
  const assets = accounts.filter((a) => a.is_asset);
  const liabilities = accounts.filter((a) => !a.is_asset);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Accounts</h1>
          <p className="text-gray-500">
            Track your bank accounts, credit cards, and other financial accounts
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={fetchData} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Account
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">{error}</div>
      )}

      {/* Loading */}
      {isLoading && accounts.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      )}

      {/* Net Worth Summary */}
      {summary && <NetWorthSummary summary={summary} />}

      {/* Empty State */}
      {!isLoading && accounts.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-gray-100 p-4">
              <Wallet className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-gray-900">
              No accounts yet
            </h3>
            <p className="mt-1 text-center text-gray-500">
              Add your bank accounts, credit cards, and other financial accounts
              <br />
              to track your net worth and cash flow.
            </p>
            <Button onClick={() => setShowForm(true)} className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Account
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Accounts List */}
      {accounts.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Assets */}
          <div>
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-gray-900">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Assets
              <span className="text-sm font-normal text-gray-500">
                ({assets.length})
              </span>
            </h2>
            <div className="space-y-3">
              <AnimatePresence>
                {assets.map((account) => (
                  <AccountCard
                    key={account.id}
                    account={account}
                    onEdit={handleEdit}
                    onDelete={fetchData}
                  />
                ))}
              </AnimatePresence>
              {assets.length === 0 && (
                <p className="py-4 text-center text-sm text-gray-500">
                  No asset accounts yet
                </p>
              )}
            </div>
          </div>

          {/* Liabilities */}
          <div>
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-gray-900">
              <span className="h-2 w-2 rounded-full bg-orange-500" />
              Liabilities
              <span className="text-sm font-normal text-gray-500">
                ({liabilities.length})
              </span>
            </h2>
            <div className="space-y-3">
              <AnimatePresence>
                {liabilities.map((account) => (
                  <AccountCard
                    key={account.id}
                    account={account}
                    onEdit={handleEdit}
                    onDelete={fetchData}
                  />
                ))}
              </AnimatePresence>
              {liabilities.length === 0 && (
                <p className="py-4 text-center text-sm text-gray-500">
                  No liability accounts yet
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <AccountForm
          account={editingAccount}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
}
