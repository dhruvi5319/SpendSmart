'use client';

import { CreditCard } from 'lucide-react';
import { Card, CardContent } from '@/components/ui';

export default function CardsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Credit Cards</h1>
        <p className="text-gray-500">Manage your cards and optimize rewards</p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="rounded-full bg-blue-100 p-4">
            <CreditCard className="h-8 w-8 text-blue-600" />
          </div>
          <h3 className="mt-4 text-lg font-medium text-gray-900">No cards added</h3>
          <p className="mt-2 text-center text-gray-500">
            Add your credit cards to optimize rewards and track spending.
          </p>
          <p className="mt-4 text-sm text-gray-400">Coming in Phase 4</p>
        </CardContent>
      </Card>
    </div>
  );
}
