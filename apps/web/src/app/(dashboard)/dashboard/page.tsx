'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { DollarSign, TrendingUp, TrendingDown, Receipt } from 'lucide-react';
import { ExpenseList } from '@/components/expenses/ExpenseList';
import { SpendingChart } from '@/components/charts/SpendingChart';
import { CategoryChart } from '@/components/charts/CategoryChart';
import { useAuthStore } from '@/stores/auth';
import { expensesService } from '@/services/expenses';

interface DashboardStats {
  totalSpent: number;
  monthlyBudget: number;
  savingsRate: number;
  transactionCount: number;
}

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const [stats, setStats] = useState<DashboardStats>({
    totalSpent: 0,
    monthlyBudget: 5000,
    savingsRate: 0,
    transactionCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Get current month's date range
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

        // Fetch expense summary from Supabase
        const summary = await expensesService.getExpenseSummary(startOfMonth, endOfMonth);

        const monthlyBudget = 5000; // TODO: Get from user settings
        const totalSpent = summary.totalUserShare;
        const savingsRate = monthlyBudget > 0 ? Math.max(0, ((monthlyBudget - totalSpent) / monthlyBudget) * 100) : 0;

        setStats({
          totalSpent,
          monthlyBudget,
          savingsRate: Math.round(savingsRate * 10) / 10,
          transactionCount: summary.transactionCount,
        });
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    {
      title: 'Total Spent',
      value: `$${stats.totalSpent.toLocaleString()}`,
      icon: DollarSign,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Monthly Budget',
      value: `$${stats.monthlyBudget.toLocaleString()}`,
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Savings Rate',
      value: `${stats.savingsRate}%`,
      icon: TrendingDown,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: 'Transactions',
      value: stats.transactionCount.toString(),
      icon: Receipt,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.user_metadata?.display_name || 'User'}!
        </h1>
        <p className="text-gray-500">Here's your financial overview for this month.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                  <p className="mt-1 text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <div className={`rounded-full p-3 ${stat.bgColor}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Daily Spending</CardTitle>
          </CardHeader>
          <CardContent>
            <SpendingChart />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Spending by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryChart />
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <ExpenseList limit={5} />
        </CardContent>
      </Card>
    </div>
  );
}
