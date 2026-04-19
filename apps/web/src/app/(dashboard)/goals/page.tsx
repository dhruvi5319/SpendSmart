'use client';

import { useState, useEffect, useCallback } from 'react';
import { Target, Plus, X } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle, Switch } from '@/components/ui';
import { GoalCard, GoalForm } from '@/components/goals';
import { goalsService, type Goal, type GoalListResponse } from '@/services/goals';

export default function GoalsPage() {
  const [data, setData] = useState<GoalListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [includeCompleted, setIncludeCompleted] = useState(true);

  const fetchGoals = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await goalsService.getGoals(includeCompleted);
      setData(response);
    } catch (err) {
      console.error('Failed to fetch goals:', err);
    } finally {
      setIsLoading(false);
    }
  }, [includeCompleted]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingGoal(null);
    fetchGoals();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const overallProgress = data?.total_target && data.total_target > 0
    ? Math.min((data.total_saved / data.total_target) * 100, 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Savings Goals</h1>
          <p className="text-gray-500">Track your progress towards financial goals</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Goal
        </Button>
      </div>

      {/* Stats Cards */}
      {data && data.total_count > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-500">Total Saved</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(data.total_saved)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-500">Total Target</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(data.total_target)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-500">Active Goals</p>
              <p className="text-2xl font-bold text-primary-600">{data.active_count}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-500">Completed</p>
              <p className="text-2xl font-bold text-green-600">{data.completed_count}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Overall Progress */}
      {data && data.total_count > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Overall Progress</span>
              <span className="text-sm text-gray-500">{overallProgress.toFixed(1)}%</span>
            </div>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-primary-600 transition-all"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter */}
      <div className="flex items-center justify-end gap-3">
        <span className="text-sm text-gray-500">Show completed</span>
        <Switch
          checked={includeCompleted}
          onCheckedChange={setIncludeCompleted}
        />
      </div>

      {/* Goals Grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-10 w-10 rounded-lg bg-gray-200" />
                <div className="mt-4 h-4 w-2/3 rounded bg-gray-200" />
                <div className="mt-4 h-2 w-full rounded-full bg-gray-200" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : data?.goals && data.goals.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onUpdate={fetchGoals}
              onEdit={(g) => {
                setEditingGoal(g);
                setShowForm(true);
              }}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="rounded-full bg-primary-100 p-4">
              <Target className="h-8 w-8 text-primary-600" />
            </div>
            <h3 className="mt-4 text-lg font-medium text-gray-900">No goals yet</h3>
            <p className="mt-2 text-center text-gray-500">
              Create your first savings goal to start tracking your progress.
            </p>
            <Button className="mt-6" onClick={() => setShowForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Goal
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{editingGoal ? 'Edit Goal' : 'New Goal'}</CardTitle>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingGoal(null);
                }}
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </CardHeader>
            <CardContent>
              <GoalForm
                goal={editingGoal || undefined}
                onSuccess={handleFormSuccess}
                onCancel={() => {
                  setShowForm(false);
                  setEditingGoal(null);
                }}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
