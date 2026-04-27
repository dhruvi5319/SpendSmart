'use client';

import { useState, useEffect } from 'react';
import { ShoppingBag, TrendingUp, AlertCircle, icons } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { expensesService, type NotablePurchasesResponse } from '@/services/expenses';

// Render a Lucide icon by name (kebab-case like "shopping-bag")
function CategoryIcon({ name, color }: { name: string | null; color: string | null }) {
  if (!name) {
    return <span className="text-lg">💰</span>;
  }

  // Convert kebab-case to PascalCase (e.g., "shopping-bag" -> "ShoppingBag")
  const pascalCase = name
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');

  const IconComponent = icons[pascalCase as keyof typeof icons];

  if (IconComponent) {
    return <IconComponent className="h-5 w-5" style={{ color: color || '#6b7280' }} />;
  }

  // Fallback to emoji if icon name not found
  return <span className="text-lg">💰</span>;
}

export function NotablePurchasesCard() {
  const [data, setData] = useState<NotablePurchasesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await expensesService.getNotablePurchases(30);
        setData(result);
      } catch (err) {
        console.error('Failed to fetch notable purchases:', err);
        setError('Unable to load notable purchases');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
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

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Notable Purchases
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-32 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Notable Purchases
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-32 flex-col items-center justify-center text-gray-500">
            <AlertCircle className="mb-2 h-8 w-8 opacity-50" />
            <p className="text-sm">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.notable_purchases.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Notable Purchases
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-32 flex-col items-center justify-center text-gray-500">
            <TrendingUp className="mb-2 h-8 w-8 opacity-50" />
            <p className="text-sm">No large purchases this month</p>
            <p className="text-xs text-gray-400">Your spending is consistent</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Notable Purchases
          </CardTitle>
          <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
            {data.notable_purchases.length} large purchase{data.notable_purchases.length > 1 ? 's' : ''}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary */}
        <div className="mb-4 rounded-lg bg-purple-50 p-3">
          <p className="text-sm text-purple-600">
            Total one-time spending:{' '}
            <span className="font-semibold">{formatCurrency(data.total_notable_amount)}</span>
          </p>
        </div>

        {/* Purchases list */}
        <div className="space-y-3">
          {data.notable_purchases.map((purchase) => (
            <div
              key={purchase.id}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-full"
                  style={{
                    backgroundColor: purchase.category_color
                      ? `${purchase.category_color}20`
                      : '#f3f4f6',
                  }}
                >
                  <CategoryIcon name={purchase.category_icon} color={purchase.category_color} />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{purchase.description}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>{formatDate(purchase.expense_date)}</span>
                    {purchase.category_name && (
                      <>
                        <span>•</span>
                        <span>{purchase.category_name}</span>
                      </>
                    )}
                    {purchase.is_household && (
                      <>
                        <span>•</span>
                        <span className="text-blue-600">Household</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900">
                  {formatCurrency(purchase.user_share)}
                </p>
                {purchase.amount !== purchase.user_share && (
                  <p className="text-xs text-gray-500">
                    of {formatCurrency(purchase.amount)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Note about exclusion */}
        <p className="mt-4 text-center text-xs text-gray-400">
          These are excluded from your daily spending average
        </p>
      </CardContent>
    </Card>
  );
}
