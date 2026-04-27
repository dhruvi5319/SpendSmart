'use client';

import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, X, AlertTriangle, FileText } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { expensesService, type Expense } from '@/services/expenses';
import { billsService, type Bill } from '@/services/bills';
import { cn } from '@/lib/utils';

interface CalendarViewProps {
  onDateClick?: (date: Date, expenses: Expense[]) => void;
}

interface DayData {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  expenses: Expense[];
  bills: Bill[];
  total: number;
  hasBillsDue: boolean;
  hasOverdueBills: boolean;
}

export function CalendarView({ onDateClick }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Fetch expenses and bills for the current month
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const startDate = new Date(year, month, 1).toISOString().split('T')[0];
        const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];

        const [expensesData, billsData] = await Promise.all([
          expensesService.getExpenses({
            start_date: startDate,
            end_date: endDate,
          }, 500, 0),
          billsService.getBills().catch(() => ({ bills: [] })),
        ]);

        setExpenses(expensesData);
        setBills(billsData.bills || []);
      } catch (err) {
        console.error('Failed to fetch data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [year, month]);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const days: DayData[] = [];
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const today = new Date();
    const todayKey = today.toISOString().split('T')[0];

    // Map expenses by date
    const expensesByDate: Record<string, Expense[]> = {};
    expenses.forEach((exp) => {
      const dateKey = exp.expense_date.split('T')[0];
      if (!expensesByDate[dateKey]) {
        expensesByDate[dateKey] = [];
      }
      expensesByDate[dateKey].push(exp);
    });

    // Map bills by due date
    const billsByDate: Record<string, Bill[]> = {};
    bills.forEach((bill) => {
      if (bill.is_active) {
        const dateKey = bill.due_date.split('T')[0];
        if (!billsByDate[dateKey]) {
          billsByDate[dateKey] = [];
        }
        billsByDate[dateKey].push(bill);
      }
    });

    const createDayData = (date: Date, isCurrentMonth: boolean): DayData => {
      const dateKey = date.toISOString().split('T')[0];
      const dayExpenses = expensesByDate[dateKey] || [];
      const dayBills = billsByDate[dateKey] || [];
      const isToday =
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear();
      const hasOverdueBills = dayBills.some(b => b.is_overdue);

      return {
        date,
        isCurrentMonth,
        isToday,
        expenses: dayExpenses,
        bills: dayBills,
        total: dayExpenses.reduce((sum, e) => sum + Number(e.amount), 0),
        hasBillsDue: dayBills.length > 0,
        hasOverdueBills,
      };
    };

    // Add days from previous month to fill the first week
    const firstDayOfWeek = firstDay.getDay();
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      days.push(createDayData(date, false));
    }

    // Add days of current month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day);
      days.push(createDayData(date, true));
    }

    // Add days from next month to fill the last week
    const remainingDays = 42 - days.length; // 6 rows * 7 days
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(year, month + 1, i);
      days.push(createDayData(date, false));
    }

    return days;
  }, [year, month, expenses, bills]);

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleDayClick = (day: DayData) => {
    if (day.expenses.length > 0 || day.bills.length > 0) {
      setSelectedDay(day);
      onDateClick?.(day.date, day.expenses);
    }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Get color intensity based on amount
  const getAmountColor = (amount: number) => {
    if (amount === 0) return '';
    if (amount < 50) return 'bg-red-100';
    if (amount < 100) return 'bg-red-200';
    if (amount < 200) return 'bg-red-300';
    return 'bg-red-400';
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={goToNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h2 className="ml-2 text-lg font-semibold">
            {monthNames[month]} {year}
          </h2>
        </div>
        <Button variant="outline" size="sm" onClick={goToToday}>
          Today
        </Button>
      </div>

      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-0">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b">
            {dayNames.map((day) => (
              <div
                key={day}
                className="p-2 text-center text-xs font-medium text-gray-500"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day, index) => (
              <button
                key={index}
                onClick={() => handleDayClick(day)}
                className={cn(
                  'relative min-h-[80px] border-b border-r p-1 text-left transition-colors hover:bg-gray-50',
                  !day.isCurrentMonth && 'bg-gray-50 text-gray-400',
                  day.isToday && 'bg-primary-50',
                  day.hasOverdueBills && 'bg-red-50',
                  (day.expenses.length > 0 || day.bills.length > 0) && 'cursor-pointer'
                )}
              >
                <span
                  className={cn(
                    'inline-flex h-6 w-6 items-center justify-center rounded-full text-sm',
                    day.isToday && 'bg-primary-600 font-medium text-white'
                  )}
                >
                  {day.date.getDate()}
                </span>

                {/* Bills indicator */}
                {day.hasBillsDue && (
                  <div
                    className={cn(
                      'mt-1 flex items-center gap-1 rounded px-1 py-0.5 text-xs font-medium',
                      day.hasOverdueBills ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                    )}
                  >
                    <FileText className="h-3 w-3" />
                    {day.bills.length} bill{day.bills.length > 1 ? 's' : ''}
                  </div>
                )}

                {/* Expenses total */}
                {day.total > 0 && (
                  <div
                    className={cn(
                      'mt-1 rounded px-1 py-0.5 text-xs font-medium',
                      getAmountColor(day.total)
                    )}
                  >
                    {formatCurrency(day.total)}
                  </div>
                )}

                {day.expenses.length > 1 && (
                  <div className="absolute bottom-1 right-1 text-[10px] text-gray-400">
                    {day.expenses.length} items
                  </div>
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Selected Day Modal */}
      {selectedDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md max-h-[80vh] overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>
                {selectedDay.date.toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </CardTitle>
              <button
                onClick={() => setSelectedDay(null)}
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </CardHeader>
            <CardContent className="max-h-[60vh] overflow-y-auto">
              {/* Bills Section */}
              {selectedDay.bills.length > 0 && (
                <div className="mb-4">
                  <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <FileText className="h-4 w-4" />
                    Bills Due
                  </h4>
                  <div className="space-y-2">
                    {selectedDay.bills.map((bill) => (
                      <div
                        key={bill.id}
                        className={cn(
                          'flex items-center justify-between rounded-lg border p-3',
                          bill.is_overdue ? 'border-red-200 bg-red-50' : 'border-blue-200 bg-blue-50'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-lg">
                            {bill.icon || '💳'}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{bill.name}</p>
                            <p className="text-xs text-gray-500">{bill.frequency}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-semibold text-gray-900">
                            ${Number(bill.amount).toFixed(2)}
                          </span>
                          {bill.is_overdue && (
                            <p className="flex items-center gap-1 text-xs text-red-600">
                              <AlertTriangle className="h-3 w-3" />
                              Overdue
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Expenses Section */}
              {selectedDay.expenses.length > 0 && (
                <div>
                  {selectedDay.bills.length > 0 && (
                    <h4 className="mb-2 text-sm font-semibold text-gray-700">Expenses</h4>
                  )}
                  <div className="space-y-3">
                    {selectedDay.expenses.map((expense) => (
                      <div
                        key={expense.id}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-sm"
                            style={{
                              backgroundColor: expense.category_color
                                ? `${expense.category_color}20`
                                : '#e5e7eb',
                            }}
                          >
                            {expense.category_icon || '📝'}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {expense.description}
                            </p>
                            <p className="text-xs text-gray-500">
                              {expense.category_name || 'Uncategorized'}
                            </p>
                          </div>
                        </div>
                        <span className="font-semibold text-gray-900">
                          ${Number(expense.amount).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedDay.expenses.length > 0 && (
                <div className="mt-4 flex items-center justify-between border-t pt-4">
                  <span className="font-medium text-gray-700">Expenses Total</span>
                  <span className="text-lg font-bold text-gray-900">
                    {formatCurrency(selectedDay.total)}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/50">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
        </div>
      )}
    </div>
  );
}
