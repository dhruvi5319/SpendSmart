'use client';

import { DebtsList } from '@/components/debts';

export default function DebtsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Owe & Lent</h1>
        <p className="text-gray-500">Track money you owe or are owed</p>
      </div>

      <DebtsList />
    </div>
  );
}
