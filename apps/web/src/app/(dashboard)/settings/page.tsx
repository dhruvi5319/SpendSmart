'use client';

import { useState } from 'react';
import { Button, Card, CardHeader, CardTitle, CardContent, Input, Switch } from '@/components/ui';
import { useAuthStore } from '@/stores/auth';

export default function SettingsPage() {
  const user = useAuthStore((state) => state.user);
  const [displayName, setDisplayName] = useState(user?.user_metadata?.display_name || '');
  const [householdSize, setHouseholdSize] = useState(2);
  const [currency, setCurrency] = useState('USD');
  const [notifications, setNotifications] = useState({
    email: true,
    budgetAlerts: true,
    weeklyReport: false,
  });

  const handleSaveProfile = () => {
    // TODO: Implement profile update
    console.log('Saving profile:', { displayName, householdSize, currency });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500">Manage your account and preferences</p>
      </div>

      {/* Profile Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="Display Name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
          <Input
            label="Email"
            value={user?.email || ''}
            disabled
            className="bg-gray-50"
          />
          <Input
            label="Default Household Size"
            type="number"
            min={1}
            max={10}
            value={householdSize}
            onChange={(e) => setHouseholdSize(parseInt(e.target.value) || 1)}
          />
          <Button onClick={handleSaveProfile}>Save Changes</Button>
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
              <p className="font-medium text-gray-900">Email Notifications</p>
              <p className="text-sm text-gray-500">Receive updates via email</p>
            </div>
            <Switch
              checked={notifications.email}
              onCheckedChange={(checked) =>
                setNotifications({ ...notifications, email: checked })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Budget Alerts</p>
              <p className="text-sm text-gray-500">
                Get notified when approaching budget limits
              </p>
            </div>
            <Switch
              checked={notifications.budgetAlerts}
              onCheckedChange={(checked) =>
                setNotifications({ ...notifications, budgetAlerts: checked })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Weekly Reports</p>
              <p className="text-sm text-gray-500">
                Receive weekly spending summaries
              </p>
            </div>
            <Switch
              checked={notifications.weeklyReport}
              onCheckedChange={(checked) =>
                setNotifications({ ...notifications, weeklyReport: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

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
            <Button variant="destructive">Delete Account</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
