'use client';

import { useState, useEffect } from 'react';
import { Plus, AlertTriangle, Calendar, DollarSign } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { BillCard } from './BillCard';
import { BillForm } from './BillForm';
import { type Bill, type BillListResponse, billsService } from '@/services/bills';

export function BillsList() {
  const [data, setData] = useState<BillListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);

  const fetchBills = async () => {
    setIsLoading(true);
    try {
      const result = await billsService.getBills();
      setData(result);
    } catch (err) {
      console.error('Failed to fetch bills:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBills();
  }, []);

  const handleUpdate = () => {
    fetchBills();
  };

  const handleEdit = (bill: Bill) => {
    setEditingBill(bill);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingBill(null);
  };

  const handleFormSuccess = () => {
    handleFormClose();
    fetchBills();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (isLoading && !data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100">
                <DollarSign className="h-5 w-5 text-primary-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Monthly Bills</p>
                <p className="text-xl font-bold">
                  {formatCurrency(data?.total_monthly_amount || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Active Bills</p>
                <p className="text-xl font-bold">{data?.active_count || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
                <Calendar className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Due This Week</p>
                <p className="text-xl font-bold">{data?.upcoming_this_week || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                (data?.overdue_count || 0) > 0 ? 'bg-red-100' : 'bg-green-100'
              }`}>
                <AlertTriangle className={`h-5 w-5 ${
                  (data?.overdue_count || 0) > 0 ? 'text-red-600' : 'text-green-600'
                }`} />
              </div>
              <div>
                <p className="text-sm text-gray-500">Overdue</p>
                <p className="text-xl font-bold">{data?.overdue_count || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Header with Add button */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Your Bills</h2>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Bill
        </Button>
      </div>

      {/* Bills Grid */}
      {data?.bills && data.bills.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.bills.map((bill) => (
            <BillCard
              key={bill.id}
              bill={bill}
              onUpdate={handleUpdate}
              onEdit={handleEdit}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-gray-300" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">No bills yet</h3>
            <p className="mt-2 text-center text-gray-500">
              Add your recurring bills to track due dates and never miss a payment.
            </p>
            <Button className="mt-4" onClick={() => setShowForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Bill
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Bill Form Modal */}
      {showForm && (
        <BillForm
          bill={editingBill}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  );
}
