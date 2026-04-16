'use client';

import { Target } from 'lucide-react';
import { Card, CardContent } from '@/components/ui';

export default function GoalsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Savings Goals</h1>
        <p className="text-gray-500">Track your progress towards financial goals</p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="rounded-full bg-primary-100 p-4">
            <Target className="h-8 w-8 text-primary-600" />
          </div>
          <h3 className="mt-4 text-lg font-medium text-gray-900">No goals yet</h3>
          <p className="mt-2 text-center text-gray-500">
            Create your first savings goal to start tracking your progress.
          </p>
          <p className="mt-4 text-sm text-gray-400">Coming in Phase 2</p>
        </CardContent>
      </Card>
    </div>
  );
}
