'use client';

import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { expensesService } from '@/services/expenses';

interface DailySpending {
  date: string;
  amount: number;
}

export function SpendingChart() {
  const [data, setData] = useState<DailySpending[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get last 14 days
        const today = new Date();
        const twoWeeksAgo = new Date(today);
        twoWeeksAgo.setDate(today.getDate() - 13);

        const startDate = twoWeeksAgo.toISOString().split('T')[0];
        const endDate = today.toISOString().split('T')[0];

        const expenses = await expensesService.getExpenses({
          start_date: startDate,
          end_date: endDate,
        }, 500);

        // Group expenses by date
        const dailyTotals: Record<string, number> = {};

        // Initialize all dates with 0
        for (let i = 13; i >= 0; i--) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];
          dailyTotals[dateStr] = 0;
        }

        // Sum expenses by date
        expenses.forEach((expense) => {
          const dateStr = expense.expense_date;
          if (dailyTotals[dateStr] !== undefined) {
            dailyTotals[dateStr] += Number(expense.user_share);
          }
        });

        // Convert to array format for chart
        const chartData = Object.entries(dailyTotals).map(([dateStr, amount]) => ({
          date: new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          amount: Math.round(amount * 100) / 100,
        }));

        setData(chartData);
      } catch (error) {
        console.error('Failed to fetch spending data:', error);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: '#e5e7eb' }}
          />
          <YAxis
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: '#e5e7eb' }}
            tickFormatter={(value) => `$${value}`}
          />
          <Tooltip
            formatter={(value: number) => [`$${value.toFixed(2)}`, 'Spent']}
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
            }}
          />
          <Line
            type="monotone"
            dataKey="amount"
            stroke="#6366f1"
            strokeWidth={2}
            dot={{ fill: '#6366f1', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, fill: '#4f46e5' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
