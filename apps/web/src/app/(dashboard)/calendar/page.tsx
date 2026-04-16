'use client';

import { Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui';

export default function CalendarPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
        <p className="text-gray-500">View your expenses and bills on a calendar</p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="rounded-full bg-purple-100 p-4">
            <Calendar className="h-8 w-8 text-purple-600" />
          </div>
          <h3 className="mt-4 text-lg font-medium text-gray-900">Calendar view</h3>
          <p className="mt-2 text-center text-gray-500">
            See your recurring bills and expenses in a calendar format.
          </p>
          <p className="mt-4 text-sm text-gray-400">Coming in Phase 2</p>
        </CardContent>
      </Card>
    </div>
  );
}
