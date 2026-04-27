'use client';

import { useState, useEffect } from 'react';
import { Save, Loader2, DollarSign, Calendar } from 'lucide-react';
import { Button, Card, CardHeader, CardTitle, CardContent, Input, Select, Switch } from '@/components/ui';
import { useAuthStore } from '@/stores/auth';
import { profileService, type UserProfile, type UpdateProfileInput, type PayFrequency } from '@/services/profile';

const currencyOptions = [
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'INR', label: 'INR - Indian Rupee' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'GBP', label: 'GBP - British Pound' },
];

const payFrequencyOptions = [
  { value: 'weekly', label: 'Weekly (every week)' },
  { value: 'biweekly', label: 'Bi-weekly (every 2 weeks)' },
  { value: 'semimonthly', label: 'Semi-monthly (1st & 15th)' },
  { value: 'monthly', label: 'Monthly (once a month)' },
];

export default function SettingsPage() {
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [displayName, setDisplayName] = useState('');
  const [householdSize, setHouseholdSize] = useState(1);
  const [currency, setCurrency] = useState('USD');
  const [monthlyIncome, setMonthlyIncome] = useState<number | ''>('');
  const [payFrequency, setPayFrequency] = useState<PayFrequency>('biweekly');
  const [nextPayDate, setNextPayDate] = useState('');
  const [reminderEnabled, setReminderEnabled] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await profileService.getProfile();
        setProfile(data);
        setDisplayName(data.display_name || '');
        setHouseholdSize(data.household_size || 1);
        setCurrency(data.primary_currency || 'USD');
        setMonthlyIncome(data.monthly_income || '');
        setPayFrequency(data.pay_frequency || 'biweekly');
        setNextPayDate(data.next_pay_date || '');
        setReminderEnabled(data.reminder_enabled || false);
      } catch (err) {
        console.error('Failed to load profile:', err);
        setError('Failed to load profile');
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handleSaveProfile = async () => {
    setError('');
    setSuccess('');
    setIsSaving(true);

    try {
      const updateData: UpdateProfileInput = {
        display_name: displayName || null,
        household_size: householdSize,
        primary_currency: currency,
        monthly_income: monthlyIncome === '' ? null : Number(monthlyIncome),
        pay_frequency: payFrequency,
        next_pay_date: nextPayDate || null,
        reminder_enabled: reminderEnabled,
      };

      const updated = await profileService.updateProfile(updateData);
      setProfile(updated);
      setSuccess('Profile saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Failed to save profile:', err);
      setError('Failed to save profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return;
    }

    try {
      await profileService.deleteAccount();
      signOut();
    } catch (err) {
      console.error('Failed to delete account:', err);
      setError('Failed to delete account. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500">Manage your account and preferences</p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">{error}</div>
      )}

      {success && (
        <div className="rounded-lg bg-green-50 p-4 text-sm text-green-600">{success}</div>
      )}

      {/* Profile Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="Display Name"
            placeholder="Your name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
          <Input
            label="Email"
            value={user?.email || profile?.email || ''}
            disabled
            className="bg-gray-50"
          />
        </CardContent>
      </Card>

      {/* Financial Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Financial Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Input
              label="Monthly Income"
              type="number"
              step="0.01"
              min="0"
              placeholder="Enter your monthly income"
              value={monthlyIncome}
              onChange={(e) => setMonthlyIncome(e.target.value === '' ? '' : parseFloat(e.target.value))}
            />
            <p className="mt-1 text-xs text-gray-500">
              Used for budget recommendations and savings calculations (50/30/20 rule)
            </p>
          </div>

          <Select
            label="Primary Currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            options={currencyOptions}
          />

          <div>
            <Input
              label="Household Size"
              type="number"
              min={1}
              max={20}
              value={householdSize}
              onChange={(e) => setHouseholdSize(parseInt(e.target.value) || 1)}
            />
            <p className="mt-1 text-xs text-gray-500">
              Used to calculate your share of household expenses
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Pay Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Pay Schedule
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-500">
            Set your pay schedule so cash flow projections can account for incoming paychecks.
          </p>

          <Select
            label="Pay Frequency"
            value={payFrequency}
            onChange={(e) => setPayFrequency(e.target.value as PayFrequency)}
            options={payFrequencyOptions}
          />

          <div>
            <Input
              label="Next Pay Date"
              type="date"
              value={nextPayDate}
              onChange={(e) => setNextPayDate(e.target.value)}
            />
            <p className="mt-1 text-xs text-gray-500">
              Enter your next expected payday. Future pay dates will be calculated automatically.
            </p>
          </div>

          {monthlyIncome && payFrequency && (
            <div className="rounded-lg bg-blue-50 p-3">
              <p className="text-sm font-medium text-blue-800">
                Paycheck Amount: ${(
                  payFrequency === 'weekly' ? monthlyIncome / 4 :
                  payFrequency === 'biweekly' ? monthlyIncome / 2 :
                  payFrequency === 'semimonthly' ? monthlyIncome / 2 :
                  monthlyIncome
                ).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Based on your monthly income of ${Number(monthlyIncome).toLocaleString()}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Daily Reminders</p>
              <p className="text-sm text-gray-500">
                Get reminded to log your daily expenses
              </p>
            </div>
            <Switch
              checked={reminderEnabled}
              onCheckedChange={setReminderEnabled}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSaveProfile} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      {/* Danger Zone */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Delete Account</p>
              <p className="text-sm text-gray-500">
                Permanently delete your account and all data
              </p>
            </div>
            <Button variant="destructive" onClick={handleDeleteAccount}>
              Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
