'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button, Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { ExpenseList, ExpenseForm } from '@/components/expenses';
import type { Expense } from '@/services/expenses';

export default function ExpensesPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleSuccess = (expense: Expense) => {
    setIsFormOpen(false);
    // Trigger refresh of expense list
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
          <p className="text-gray-500">Track and manage your spending</p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Expense
        </Button>
      </div>

      {/* Add Expense Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Add New Expense</CardTitle>
              <button
                onClick={() => setIsFormOpen(false)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </CardHeader>
            <CardContent>
              <ExpenseForm
                onSuccess={handleSuccess}
                onCancel={() => setIsFormOpen(false)}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Expense List */}
      <Card>
        <CardHeader>
          <CardTitle>All Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <ExpenseList refreshTrigger={refreshTrigger} />
        </CardContent>
      </Card>
    </div>
  );
}
