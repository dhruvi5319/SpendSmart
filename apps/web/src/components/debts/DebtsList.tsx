'use client';

import { useState, useEffect } from 'react';
import { Plus, ArrowDownLeft, ArrowUpRight, Users } from 'lucide-react';
import { Button, Card, CardContent } from '@/components/ui';
import { DebtCard } from './DebtCard';
import { DebtForm } from './DebtForm';
import { type Debt, type DebtListResponse, debtsService } from '@/services/debts';

export function DebtsList() {
  const [data, setData] = useState<DebtListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<'all' | 'owed_to_me' | 'owed_by_me'>('all');

  const fetchDebts = async () => {
    setIsLoading(true);
    try {
      const debtType = filter === 'all' ? undefined : filter;
      const result = await debtsService.getDebts(false, debtType);
      setData(result);
    } catch (err) {
      console.error('Failed to fetch debts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDebts();
  }, [filter]);

  const handleUpdate = () => {
    fetchDebts();
  };

  const handleFormClose = () => {
    setShowForm(false);
  };

  const handleFormSuccess = () => {
    handleFormClose();
    fetchDebts();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (isLoading && !data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  const netBalance = data?.net_balance || 0;
  const netBalanceLabel = netBalance >= 0 ? 'Others owe you' : 'You owe others';
  const netBalanceColor = netBalance >= 0 ? 'text-emerald-600' : 'text-orange-600';

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                <ArrowDownLeft className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Owed to You</p>
                <p className="text-xl font-bold text-emerald-600">
                  {formatCurrency(data?.total_owed_to_me || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100">
                <ArrowUpRight className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">You Owe</p>
                <p className="text-xl font-bold text-orange-600">
                  {formatCurrency(data?.total_owed_by_me || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                netBalance >= 0 ? 'bg-emerald-100' : 'bg-orange-100'
              }`}>
                <Users className={`h-5 w-5 ${
                  netBalance >= 0 ? 'text-emerald-600' : 'text-orange-600'
                }`} />
              </div>
              <div>
                <p className="text-sm text-gray-500">{netBalanceLabel}</p>
                <p className={`text-xl font-bold ${netBalanceColor}`}>
                  {formatCurrency(Math.abs(netBalance))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                <Users className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Active Debts</p>
                <p className="text-xl font-bold">{data?.total_count || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Header with filter and Add button */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-primary-100 text-primary-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('owed_to_me')}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              filter === 'owed_to_me'
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Owed to Me ({data?.owed_to_me_count || 0})
          </button>
          <button
            onClick={() => setFilter('owed_by_me')}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              filter === 'owed_by_me'
                ? 'bg-orange-100 text-orange-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            I Owe ({data?.owed_by_me_count || 0})
          </button>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Debt
        </Button>
      </div>

      {/* Debts Grid */}
      {data?.debts && data.debts.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.debts.map((debt) => (
            <DebtCard key={debt.id} debt={debt} onUpdate={handleUpdate} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-gray-300" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">No debts yet</h3>
            <p className="mt-2 text-center text-gray-500">
              Track money you lend or borrow from friends and family.
            </p>
            <Button className="mt-4" onClick={() => setShowForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Debt
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Debt Form Modal */}
      {showForm && (
        <DebtForm onClose={handleFormClose} onSuccess={handleFormSuccess} />
      )}
    </div>
  );
}
