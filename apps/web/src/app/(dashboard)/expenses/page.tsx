'use client';

import { useState } from 'react';
import { Plus, X, Trash2 } from 'lucide-react';
import { Button, Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { ExpenseList, ExpenseForm } from '@/components/expenses';
import { expensesService, type Expense } from '@/services/expenses';

export default function ExpensesPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSuccess = () => {
    setIsFormOpen(false);
    setEditingExpense(null);
    // Trigger refresh of expense list
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (!editingExpense) return;

    setIsDeleting(true);
    try {
      await expensesService.deleteExpense(editingExpense.id);
      handleSuccess();
    } catch (err) {
      console.error('Failed to delete expense:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    setIsFormOpen(false);
    setEditingExpense(null);
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

      {/* Add/Edit Expense Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{editingExpense ? 'Edit Expense' : 'Add New Expense'}</CardTitle>
              <div className="flex items-center gap-2">
                {editingExpense && (
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="rounded-lg p-2 text-red-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                    title="Delete expense"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                )}
                <button
                  onClick={handleClose}
                  className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <ExpenseForm
                expense={editingExpense || undefined}
                onSuccess={handleSuccess}
                onCancel={handleClose}
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
          <ExpenseList refreshTrigger={refreshTrigger} onEdit={handleEdit} />
        </CardContent>
      </Card>
    </div>
  );
}
