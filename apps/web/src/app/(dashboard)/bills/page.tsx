'use client';

import { BillsList } from '@/components/bills';

export default function BillsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bills</h1>
        <p className="text-gray-500">Track and manage your recurring bills</p>
      </div>

      <BillsList />
    </div>
  );
}
