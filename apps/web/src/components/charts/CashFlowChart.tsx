'use client';

import { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from 'recharts';
import { AlertTriangle, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import {
  predictionsService,
  type CashFlowForecast,
  type CashFlowProjectionPoint,
} from '@/services/predictions';

interface CashFlowChartProps {
  daysAhead?: number;
}

export function CashFlowChart({ daysAhead = 30 }: CashFlowChartProps) {
  const [forecast, setForecast] = useState<CashFlowForecast | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchForecast = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await predictionsService.getCashFlowForecast(daysAhead);
        setForecast(data);
      } catch (err) {
        console.error('Failed to fetch cash flow forecast:', err);
        setError('Unable to load cash flow projection');
      } finally {
        setIsLoading(false);
      }
    };

    fetchForecast();
  }, [daysAhead]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Cash Flow Projection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !forecast) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Cash Flow Projection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 flex-col items-center justify-center text-gray-500">
            <Wallet className="mb-2 h-12 w-12 opacity-50" />
            <p>{error || 'No projection data available'}</p>
            <p className="text-sm">Add accounts and bills to see your cash flow</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Find danger zones for highlighting
  const dangerStart = forecast.projection.find(p => p.is_danger)?.date;
  const dangerEnd = forecast.projection.filter(p => p.is_danger).pop()?.date;

  // Calculate trend
  const balanceChange = forecast.projected_end_balance - forecast.current_balance;
  const isTrendingDown = balanceChange < 0;

  // Prepare chart data
  const chartData = forecast.projection.map(point => ({
    ...point,
    date: formatDate(point.date),
    fullDate: point.date,
  }));

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.[0]) return null;

    const data = payload[0].payload as CashFlowProjectionPoint & { fullDate: string };
    const date = new Date(data.fullDate);

    return (
      <div className="rounded-lg border bg-white p-3 shadow-lg">
        <p className="font-medium text-gray-900">
          {date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          })}
        </p>
        <div className="mt-2 space-y-1 text-sm">
          <p className="flex items-center justify-between gap-4">
            <span className="text-gray-500">Balance:</span>
            <span className={data.is_danger ? 'font-medium text-red-600' : 'font-medium text-gray-900'}>
              {formatCurrency(data.balance)}
            </span>
          </p>
          {data.expected_spending > 0 && (
            <p className="flex items-center justify-between gap-4">
              <span className="text-gray-500">Expected Spending:</span>
              <span className="text-gray-700">{formatCurrency(data.expected_spending)}</span>
            </p>
          )}
          {data.bills_due > 0 && (
            <p className="flex items-center justify-between gap-4">
              <span className="text-gray-500">Bills Due:</span>
              <span className="text-orange-600">{formatCurrency(data.bills_due)}</span>
            </p>
          )}
        </div>
        {data.is_danger && (
          <div className="mt-2 flex items-center gap-1 text-xs text-red-600">
            <AlertTriangle className="h-3 w-3" />
            Danger Zone
          </div>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Cash Flow Projection ({daysAhead} Days)
          </CardTitle>
          {forecast.has_danger_zone && (
            <span className="flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
              <AlertTriangle className="h-3 w-3" />
              Danger Zone Detected
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg border bg-gray-50 p-3">
            <p className="text-xs text-gray-500">Current Balance</p>
            <p className="text-lg font-semibold text-gray-900">
              {formatCurrency(forecast.current_balance)}
            </p>
          </div>
          <div className="rounded-lg border bg-gray-50 p-3">
            <p className="text-xs text-gray-500">Projected End</p>
            <p className={`text-lg font-semibold ${forecast.projected_end_balance < 0 ? 'text-red-600' : 'text-gray-900'}`}>
              {formatCurrency(forecast.projected_end_balance)}
            </p>
          </div>
          <div className="rounded-lg border bg-gray-50 p-3">
            <p className="text-xs text-gray-500">Upcoming Bills</p>
            <p className="text-lg font-semibold text-orange-600">
              {formatCurrency(forecast.total_bills_upcoming)}
            </p>
          </div>
          <div className="rounded-lg border bg-gray-50 p-3">
            <p className="text-xs text-gray-500">Avg Daily Spend</p>
            <p className="text-lg font-semibold text-gray-900">
              {formatCurrency(forecast.avg_daily_spending)}
            </p>
          </div>
        </div>

        {/* Chart */}
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="dangerGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `$${value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="3 3" label="" />
              <Area
                type="monotone"
                dataKey="balance"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#balanceGradient)"
                dot={false}
                activeDot={{ r: 4, fill: '#10b981' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Trend indicator */}
        <div className="mt-4 flex items-center justify-between border-t pt-4">
          <div className="flex items-center gap-2">
            {isTrendingDown ? (
              <TrendingDown className="h-5 w-5 text-red-500" />
            ) : (
              <TrendingUp className="h-5 w-5 text-green-500" />
            )}
            <span className="text-sm text-gray-600">
              {isTrendingDown ? 'Balance decreasing by ' : 'Balance increasing by '}
              <span className={isTrendingDown ? 'font-medium text-red-600' : 'font-medium text-green-600'}>
                {formatCurrency(Math.abs(balanceChange))}
              </span>
              {` over ${daysAhead} days`}
            </span>
          </div>
          {forecast.min_balance < 0 && (
            <span className="text-sm text-red-600">
              Minimum: {formatCurrency(forecast.min_balance)} on{' '}
              {new Date(forecast.min_balance_date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
