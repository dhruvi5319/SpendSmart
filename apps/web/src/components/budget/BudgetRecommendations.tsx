'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, AlertTriangle, Lightbulb, TrendingUp, Wallet, PiggyBank } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { budgetService, type BudgetRecommendations as BudgetRecs } from '@/services/budget';
import { cn } from '@/lib/utils';

interface BudgetRecommendationsProps {
  className?: string;
}

export function BudgetRecommendations({ className }: BudgetRecommendationsProps) {
  const [data, setData] = useState<BudgetRecs | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        const recommendations = await budgetService.getRecommendations(undefined, 3);
        setData(recommendations);
      } catch (err) {
        console.error('Failed to fetch budget recommendations:', err);
        setError('Failed to load recommendations');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecommendations();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'alert':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'tip':
        return <Lightbulb className="h-5 w-5 text-blue-500" />;
      default:
        return <Lightbulb className="h-5 w-5 text-gray-500" />;
    }
  };

  const getRecommendationBg = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'alert':
        return 'bg-red-50 border-red-200';
      case 'tip':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg">Budget Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-32 items-center justify-center">
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
          <CardTitle className="text-lg">Budget Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-32 flex-col items-center justify-center text-gray-500">
            <AlertCircle className="h-8 w-8 mb-2" />
            <p>{error || 'Unable to load recommendations'}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data.has_data) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg">Budget Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-32 flex-col items-center justify-center text-gray-500">
            <Wallet className="h-8 w-8 mb-2 text-gray-400" />
            <p className="text-center">{data.message}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg">Budget Insights</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-gray-50 p-3 text-center">
            <TrendingUp className="mx-auto h-5 w-5 text-gray-400" />
            <p className="mt-1 text-xs text-gray-500">Spending</p>
            <p className="text-sm font-semibold">{formatCurrency(data.summary?.monthly_spending || 0)}</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-3 text-center">
            <Wallet className="mx-auto h-5 w-5 text-gray-400" />
            <p className="mt-1 text-xs text-gray-500">Income</p>
            <p className="text-sm font-semibold">{formatCurrency(data.summary?.monthly_income || 0)}</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-3 text-center">
            <PiggyBank className="mx-auto h-5 w-5 text-gray-400" />
            <p className="mt-1 text-xs text-gray-500">Savings</p>
            <p className={cn(
              "text-sm font-semibold",
              (data.summary?.savings_rate || 0) >= 20 ? "text-green-600" : "text-yellow-600"
            )}>
              {data.summary?.savings_rate?.toFixed(0)}%
            </p>
          </div>
        </div>

        {/* 50/30/20 Breakdown */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-500 uppercase">50/30/20 Rule</p>
          <div className="h-3 flex rounded-full overflow-hidden bg-gray-100">
            <div
              className="bg-blue-500"
              style={{ width: `${data.summary?.needs_percent || 0}%` }}
              title={`Needs: ${data.summary?.needs_percent?.toFixed(0)}%`}
            />
            <div
              className="bg-purple-500"
              style={{ width: `${data.summary?.wants_percent || 0}%` }}
              title={`Wants: ${data.summary?.wants_percent?.toFixed(0)}%`}
            />
            <div
              className="bg-green-500"
              style={{ width: `${data.summary?.savings_rate || 0}%` }}
              title={`Savings: ${data.summary?.savings_rate?.toFixed(0)}%`}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              Needs {data.summary?.needs_percent?.toFixed(0)}%
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-purple-500" />
              Wants {data.summary?.wants_percent?.toFixed(0)}%
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              Save {data.summary?.savings_rate?.toFixed(0)}%
            </span>
          </div>
        </div>

        {/* Recommendations */}
        {data.recommendations && data.recommendations.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-500 uppercase">Recommendations</p>
            {data.recommendations.slice(0, 3).map((rec, index) => (
              <div
                key={index}
                className={cn(
                  "flex items-start gap-3 rounded-lg border p-3",
                  getRecommendationBg(rec.type)
                )}
              >
                {getRecommendationIcon(rec.type)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700">{rec.message}</p>
                  <p className="mt-1 text-xs text-gray-500">{rec.action}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
