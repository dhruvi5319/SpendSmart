'use client';

import { CalendarView } from '@/components/calendar';

export default function CalendarPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
        <p className="text-gray-500">View your expenses and bills on a calendar</p>
      </div>

      <CalendarView />
    </div>
  );
}
