
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Shield, Server, Database, Globe, Bell, Lock, Loader2 } from 'lucide-react';
import { useSystemSettings } from '@/hooks/use-system-settings';
import { useAuth } from '@/contexts/AuthContext';

export const SettingsManagement = () => {
  const { user } = useAuth();
  const { settings, setSettings, loading, saving, saveAllSettings } = useSystemSettings();

  const [recentActivity] = useState([
    { action: "Updated system settings", timestamp: "Today, 10:15 AM" },
    { action: "Processed user refund (user: john@example.com)", timestamp: "Yesterday, 3:45 PM" },
    { action: "Added new contest", timestamp: "Apr 25, 2025, 11:20 AM" },
    { action: "Modified pricing plan", timestamp: "Apr 23, 2025, 2:10 PM" },
    { action: "Approved 5 contest entries", timestamp: "Apr 20, 2025, 9:30 AM" },
  ]);

  const adminProfile = {
    adminType: user?.email === "ellaadahosa@gmail.com" ? "super_admin" : "ordinary_admin",
    joinedDate: "January 15, 2025",
    email: user?.email || "admin@afroverse.com"
  };

  const handleInputChange = (section: string, field: string, value: any) => {
    setSettings({
      ...settings,
      [section]: {
        ...settings[section as keyof typeof settings],
        [field]: value
      }
    });
  };

  const handleToggle = (section: string, field: string, checked: boolean) => {
    setSettings({
      ...settings,
      [section]: {
        ...settings[section as keyof typeof settings],
        [field]: checked
      }
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">System Settings</h2>
        <Button 
          onClick={saveAllSettings} 
          disabled={saving}
        >
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save All Settings
        </Button>
      </div>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="api">API Settings</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="admin-profile">Admin Profile</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>General Settings</CardTitle>
                  <CardDescription>Manage basic system configuration</CardDescription>
                </div>
                <Globe className="text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Site Name</label>
                  <Input
                    value={settings.general.siteName}
                    onChange={(e) => handleInputChange('general', 'siteName', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Support Email</label>
                  <Input
                    type="email"
                    value={settings.general.supportEmail}
                    onChange={(e) => handleInputChange('general', 'supportEmail', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Maximum File Size (MB)</label>
                  <Input
                    type="number"
                    value={settings.general.maximumFileSize}
                    onChange={(e) => handleInputChange('general', 'maximumFileSize', parseInt(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Auto-Delete Days</label>
                  <Input
                    type="number"
                    value={settings.general.autoDeleteDays}
                    onChange={(e) => handleInputChange('general', 'autoDeleteDays', parseInt(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">Number of days before temporary files are auto-deleted</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Settings */}
        <TabsContent value="api" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>API Settings</CardTitle>
                  <CardDescription>Configure API behavior and limitations</CardDescription>
                </div>
                <Server className="text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">API Rate Limit (requests/minute)</label>
                  <Input
                    type="number"
                    value={settings.api.rateLimit}
                    onChange={(e) => handleInputChange('api', 'rateLimit', parseInt(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Cache Duration (minutes)</label>
                  <Input
                    type="number"
                    value={settings.api.cacheDuration}
                    onChange={(e) => handleInputChange('api', 'cacheDuration', parseInt(e.target.value))}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={settings.api.enableThrottling}
                    onCheckedChange={(checked) => handleToggle('api', 'enableThrottling', checked)}
                  />
                  <label>Enable API Throttling</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={settings.api.logApiCalls}
                    onCheckedChange={(checked) => handleToggle('api', 'logApiCalls', checked)}
                  />
                  <label>Log All API Calls</label>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Security Settings</CardTitle>
                  <CardDescription>Configure system security and authentication</CardDescription>
                </div>
                <Lock className="text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Minimum Password Length</label>
                  <Input
                    type="number"
                    value={settings.security.passwordMinLength}
                    onChange={(e) => handleInputChange('security', 'passwordMinLength', parseInt(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Session Timeout (minutes)</label>
                  <Input
                    type="number"
                    value={settings.security.sessionTimeout}
                    onChange={(e) => handleInputChange('security', 'sessionTimeout', parseInt(e.target.value))}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={settings.security.passwordRequiresSymbol}
                    onCheckedChange={(checked) => handleToggle('security', 'passwordRequiresSymbol', checked)}
                  />
                  <label>Require Symbol in Password</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={settings.security.twoFactorEnabled}
                    onCheckedChange={(checked) => handleToggle('security', 'twoFactorEnabled', checked)}
                  />
                  <label>Enable Two-Factor Authentication</label>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Notification Settings</CardTitle>
                  <CardDescription>Configure system notifications and alerts</CardDescription>
                </div>
                <Bell className="text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-1">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={settings.notifications.emailNotifications}
                    onCheckedChange={(checked) => handleToggle('notifications', 'emailNotifications', checked)}
                  />
                  <label>Email Notifications</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={settings.notifications.songCompletionNotices}
                    onCheckedChange={(checked) => handleToggle('notifications', 'songCompletionNotices', checked)}
                  />
                  <label>Song Completion Notices</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={settings.notifications.systemAnnouncements}
                    onCheckedChange={(checked) => handleToggle('notifications', 'systemAnnouncements', checked)}
                  />
                  <label>System Announcements</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={settings.notifications.marketingEmails}
                    onCheckedChange={(checked) => handleToggle('notifications', 'marketingEmails', checked)}
                  />
                  <label>Marketing Emails</label>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Admin Profile */}
        <TabsContent value="admin-profile" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Admin Profile</CardTitle>
                  <CardDescription>Your administrator profile information</CardDescription>
                </div>
                <Shield className="text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Admin Type</label>
                  <select 
                    className="w-full border rounded-md p-2"
                    value={adminProfile.adminType}
                    disabled
                  >
                    <option value="super_admin">Super Admin</option>
                    <option value="ordinary_admin">Ordinary Admin</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    type="email"
                    value={adminProfile.email}
                    readOnly
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Joined Date</label>
                  <Input
                    readOnly
                    value={adminProfile.joinedDate}
                  />
                </div>
              </div>

              <div className="mt-6">
                <h3 className="text-lg font-medium mb-4">Activity History</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Action</TableHead>
                      <TableHead>Timestamp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentActivity.map((activity, index) => (
                      <TableRow key={index}>
                        <TableCell>{activity.action}</TableCell>
                        <TableCell>{activity.timestamp}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="mt-6">
                <h3 className="text-lg font-medium mb-4">Activity Analysis</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">Total Actions</p>
                      <p className="text-xl font-bold">248</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">User Management</p>
                      <p className="text-xl font-bold">82</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">System Changes</p>
                      <p className="text-xl font-bold">45</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
