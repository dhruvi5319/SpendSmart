'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus, AlertCircle } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  ComposedChart,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { predictionsService, type SpendingForecast } from '@/services/predictions';
import { cn } from '@/lib/utils';

interface PredictionChartProps {
  className?: string;
}

export function PredictionChart({ className }: PredictionChartProps) {
  const [data, setData] = useState<SpendingForecast | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPredictions = async () => {
      try {
        const forecast = await predictionsService.getSpendingForecast(30, 90);
        setData(forecast);
      } catch (err) {
        console.error('Failed to fetch predictions:', err);
        setError('Failed to load predictions');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPredictions();
  }, []);

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

  const getTrendIcon = () => {
    if (!data?.summary?.trend) return null;

    switch (data.summary.trend) {
      case 'increasing':
        return <TrendingUp className="h-4 w-4 text-red-500" />;
      case 'decreasing':
        return <TrendingDown className="h-4 w-4 text-green-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTrendText = () => {
    if (!data?.summary?.trend) return '';

    const diff = data.summary.predicted_daily_average - data.summary.current_daily_average;
    const percentChange = Math.abs((diff / data.summary.current_daily_average) * 100);

    if (data.summary.trend === 'increasing') {
      return `Spending expected to increase by ${percentChange.toFixed(1)}%`;
    } else if (data.summary.trend === 'decreasing') {
      return `Spending expected to decrease by ${percentChange.toFixed(1)}%`;
    }
    return 'Spending expected to remain stable';
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg">Spending Forecast</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg">Spending Forecast</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 flex-col items-center justify-center text-gray-500">
            <AlertCircle className="h-8 w-8 mb-2" />
            <p>{error || 'Unable to load predictions'}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data.has_sufficient_data) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg">Spending Forecast</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 flex-col items-center justify-center text-gray-500">
            <AlertCircle className="h-8 w-8 mb-2 text-yellow-500" />
            <p className="text-center">{data.message}</p>
            <p className="mt-2 text-sm">Keep tracking your expenses to unlock predictions!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.forecast.map((point) => ({
    date: point.date,
    predicted: point.predicted,
    lower: point.lower_bound,
    upper: point.upper_bound,
    range: point.upper_bound && point.lower_bound
      ? [point.lower_bound, point.upper_bound]
      : undefined,
  }));

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">30-Day Spending Forecast</CardTitle>
          <div className="flex items-center gap-2">
            {getTrendIcon()}
            <span className="text-sm text-gray-500">{data.summary.trend}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-xs text-gray-500">Predicted Total</p>
            <p className="text-lg font-semibold text-gray-900">
              {formatCurrency(data.summary.predicted_monthly_total)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Daily Average</p>
            <p className="text-lg font-semibold text-gray-900">
              {formatCurrency(data.summary.predicted_daily_average)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Current Avg</p>
            <p className="text-lg font-semibold text-gray-900">
              {formatCurrency(data.summary.current_daily_average)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Historical Monthly</p>
            <p className="text-lg font-semibold text-gray-900">
              {formatCurrency(data.summary.historical_monthly_average)}
            </p>
          </div>
        </div>

        {/* Trend message */}
        <p className="mb-4 text-sm text-gray-600">{getTrendText()}</p>

        {/* Chart */}
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                tick={{ fontSize: 12, fill: '#6b7280' }}
                interval="preserveStartEnd"
              />
              <YAxis
                tickFormatter={(value) => `$${value}`}
                tick={{ fontSize: 12, fill: '#6b7280' }}
                width={50}
              />
              <Tooltip
                formatter={(value: number) => [formatCurrency(value), 'Predicted']}
                labelFormatter={(label) => formatDate(label)}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
              />
              {/* Confidence interval area */}
              <Area
                dataKey="range"
                fill="#4f46e5"
                fillOpacity={0.1}
                stroke="none"
              />
              {/* Prediction line */}
              <Line
                type="monotone"
                dataKey="predicted"
                stroke="#4f46e5"
                strokeWidth={2}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
