'use client';

import { useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';

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

// Mock data - will be replaced with API call
const mockCategoryData = [
  { name: 'Housing', value: 1200, color: COLORS[0] },
  { name: 'Groceries', value: 450, color: COLORS[1] },
  { name: 'Transport', value: 280, color: COLORS[2] },
  { name: 'Dining', value: 220, color: COLORS[3] },
  { name: 'Entertainment', value: 180, color: COLORS[4] },
  { name: 'Utilities', value: 150, color: COLORS[5] },
  { name: 'Health', value: 120, color: COLORS[6] },
  { name: 'Other', value: 247.52, color: COLORS[7] },
];

export function CategoryChart() {
  const data = useMemo(() => mockCategoryData, []);
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
            formatter={(value, entry) => (
              <span className="text-sm text-gray-600">{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
