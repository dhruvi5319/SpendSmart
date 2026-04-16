'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';
import { expensesService } from '@/services/expenses';

const COLORS = [
  '#6366f1', // indigo
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
];

interface CategoryData {
  name: string;
  value: number;
  color: string;
}

export function CategoryChart() {
  const [data, setData] = useState<CategoryData[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get current month
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

        const summary = await expensesService.getExpenseSummary(startOfMonth, endOfMonth);

        // Convert to chart format
        const chartData = summary.byCategory.map((cat, index) => ({
          name: cat.name,
          value: Math.round(cat.total * 100) / 100,
          color: cat.color || COLORS[index % COLORS.length],
        }));

        setData(chartData);
      } catch (error) {
        console.error('Failed to fetch category data:', error);
      }
    };

    fetchData();
  }, []);

  const total = useMemo(
    () => data.reduce((sum, item) => sum + item.value, 0),
    [data]
  );

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) => [
              `$${value.toFixed(2)} (${((value / total) * 100).toFixed(1)}%)`,
              'Amount',
            ]}
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
            }}
          />
          <Legend
            layout="vertical"
            align="right"
            verticalAlign="middle"
            formatter={(value) => (
              <span className="text-sm text-gray-600">{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
