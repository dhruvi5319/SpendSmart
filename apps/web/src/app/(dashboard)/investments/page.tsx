'use client';

import { TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui';

export default function InvestmentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Investments</h1>
        <p className="text-gray-500">Monitor your investment portfolio</p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="rounded-full bg-green-100 p-4">
            <TrendingUp className="h-8 w-8 text-green-600" />
          </div>
          <h3 className="mt-4 text-lg font-medium text-gray-900">No investments tracked</h3>
          <p className="mt-2 text-center text-gray-500">
            Connect your brokerage accounts to track investments.
          </p>
          <p className="mt-4 text-sm text-gray-400">Coming in Phase 4</p>
        </CardContent>
      </Card>
    </div>
  );
}
