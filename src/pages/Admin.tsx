
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Users, Settings, Music, Key, Trophy, FileText, CreditCard, HelpCircle, BarChart3, Cog, DollarSign, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

// Import admin components with named imports
import { UserManagement } from "@/components/admin/UserManagement";
import { AdminManagement } from "@/components/admin/AdminManagement";
import { GenreManagement } from "@/components/admin/GenreManagement";
import { SunoApiManagement } from "@/components/admin/SunoApiManagement";
import { ContestManagement } from "@/components/admin/ContestManagement";
import { ContentManagement } from "@/components/admin/ContentManagement";
import { PaymentManagement } from "@/components/admin/PaymentManagement";
import { SupportManagement } from "@/components/admin/SupportManagement";
import { ReportsAnalytics } from "@/components/admin/ReportsAnalytics";
import { SettingsManagement } from "@/components/admin/SettingsManagement";
import AffiliateManagementTab from "@/components/admin/affiliate/AffiliateManagementTab";

interface AdminProps {
  tab?: string;
}

const Admin = ({ tab }: AdminProps) => {
  const { user, logout, isAdmin, isSuperAdmin, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState(tab || "overview");
  const [adminStats, setAdminStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalSongs: 0,
    pendingRequests: 0
  });

  useEffect(() => {
    const fetchAdminStats = async () => {
      if (!user) return;
      try {
        const { count: userCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        setAdminStats(prev => ({
          ...prev,
          totalUsers: userCount || 0,
          activeUsers: userCount || 0,
          totalSongs: 0,
          pendingRequests: 0
        }));
      } catch (error) {
        console.error('Error fetching admin stats:', error);
      }
    };

    if (isAdmin() || isSuperAdmin()) {
      fetchAdminStats();
    }
  }, [user, isAdmin, isSuperAdmin]);

  const handleLogout = async () => {
    await logout();
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-melody-dark">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        <p className="ml-4 text-lg text-melody-light">Verifying admin access...</p>
      </div>
    );
  }

  // Add an explicit check for user object before calling isAdmin/isSuperAdmin
  if (!user) {
    // This case should ideally be handled by ProtectedRoute or AdminLayout sending to login.
    // Redirecting to admin login as a fallback if somehow reached.
    console.warn("Admin.tsx: No user object available after auth loading. Redirecting to admin login.");
    return <Navigate to="/admin/login" replace />;
  }

  if (!isAdmin() && !isSuperAdmin()) {
    console.warn("Admin.tsx: User is not admin/super_admin. This should have been caught by ProtectedRoute/AdminLayout. Redirecting to dashboard.");
    return <Navigate to="/dashboard" replace />;
  }

  const renderStatusLabel = (status: string) => {
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${
        status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
      }`}>
        {status === 'active' ? 'Active' : 'Suspended'}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-melody-dark text-melody-light">
      {/* Admin Header */}
      <div className="border-b border-border bg-card shadow-sm">
        <div className="container mx-auto py-4 px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Music className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-primary">Admin Control Panel</h1>
                <p className="text-muted-foreground text-sm">System administration and management console</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">Administrator: {user?.email}</span>
              <Button variant="outline" onClick={handleLogout} className="flex items-center gap-2">
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Content */}
      <div className="container mx-auto py-8 px-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="w-full overflow-x-auto pb-2"> {/* Added a wrapper for scrolling, pb-2 for scrollbar space */}
            <TabsList className="bg-card justify-start"> {/* Removed grid classes, kept bg-card, added justify-start */}
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="admins">Admins</TabsTrigger>
            <TabsTrigger value="genres">Genres</TabsTrigger>
            <TabsTrigger value="suno-api">API</TabsTrigger>
            <TabsTrigger value="contest">Contest</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="support">Support</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="affiliates">Affiliates</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Admin Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{adminStats.totalUsers}</div>
                  <p className="text-xs text-muted-foreground">Registered users</p>
                </CardContent>
              </Card>

              <Card className="bg-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                  <Users className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{adminStats.activeUsers}</div>
                  <p className="text-xs text-muted-foreground">Active this month</p>
                </CardContent>
              </Card>

              <Card className="bg-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">System Health</CardTitle>
                  <BarChart3 className="h-4 w-4 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">Healthy</div>
                  <p className="text-xs text-muted-foreground">All systems operational</p>
                </CardContent>
              </Card>

              <Card className="bg-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Actions</CardTitle>
                  <HelpCircle className="h-4 w-4 text-yellow-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{adminStats.pendingRequests}</div>
                  <p className="text-xs text-muted-foreground">Require attention</p>
                </CardContent>
              </Card>
            </div>

            {/* Admin Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-card">
                <CardHeader>
                  <CardTitle>Administrative Actions</CardTitle>
                  <CardDescription>Quick access to common admin tasks</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    variant="outline"
                    onClick={() => setActiveTab("users")}
                    className="w-full justify-start"
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Manage Users & Permissions
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setActiveTab("genres")}
                    className="w-full justify-start"
                  >
                    <Music className="h-4 w-4 mr-2" />
                    Configure Music Genres
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setActiveTab("suno-api")}
                    className="w-full justify-start"
                  >
                    <Key className="h-4 w-4 mr-2" />
                    API Key Management
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setActiveTab("reports")}
                    className="w-full justify-start"
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    System Analytics
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-card">
                <CardHeader>
                  <CardTitle>System Status</CardTitle>
                  <CardDescription>Current system health and performance</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Database Connection</span>
                    <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">Connected</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">API Services</span>
                    <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">Online</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Background Jobs</span>
                    <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">Running</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Storage Usage</span>
                    <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">75% Used</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Admin Management Tabs */}
          <TabsContent value="users" className="space-y-4">
            <Card className="bg-card">
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>Manage user accounts, roles, and permissions</CardDescription>
              </CardHeader>
              <CardContent>
                <UserManagement users={[]} renderStatusLabel={renderStatusLabel} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="admins" className="space-y-4">
            <Card className="bg-card">
              <CardHeader>
                <CardTitle>Administrator Management</CardTitle>
                <CardDescription>Manage administrator accounts and permissions</CardDescription>
              </CardHeader>
              <CardContent>
                <AdminManagement />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="genres" className="space-y-4">
            <Card className="bg-card">
              <CardHeader>
                <CardTitle>Genre Management</CardTitle>
                <CardDescription>Manage music genres and AI prompt templates</CardDescription>
              </CardHeader>
              <CardContent>
                <GenreManagement />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="suno-api" className="space-y-4">
            <Card className="bg-card">
              <CardHeader>
                <CardTitle>Suno API Management</CardTitle>
                <CardDescription>Manage Suno API keys and configuration</CardDescription>
              </CardHeader>
              <CardContent>
                <SunoApiManagement />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contest" className="space-y-4">
            <Card className="bg-card">
              <CardHeader>
                <CardTitle>Contest Management</CardTitle>
                <CardDescription>Manage contests, entries, and voting</CardDescription>
              </CardHeader>
              <CardContent>
                <ContestManagement />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="content" className="space-y-4">
            <Card className="bg-card">
              <CardHeader>
                <CardTitle>Content Management</CardTitle>
                <CardDescription>Manage content moderation and flags</CardDescription>
              </CardHeader>
              <CardContent>
                <ContentManagement />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments" className="space-y-4">
            <Card className="bg-card">
              <CardHeader>
                <CardTitle>Payment Management</CardTitle>
                <CardDescription>Manage payments, transactions, and billing</CardDescription>
              </CardHeader>
              <CardContent>
                <PaymentManagement />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="support" className="space-y-4">
            <Card className="bg-card">
              <CardHeader>
                <CardTitle>Support Management</CardTitle>
                <CardDescription>Manage support tickets and user inquiries</CardDescription>
              </CardHeader>
              <CardContent>
                <SupportManagement />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <Card className="bg-card">
              <CardHeader>
                <CardTitle>Reports & Analytics</CardTitle>
                <CardDescription>View system analytics and generate reports</CardDescription>
              </CardHeader>
              <CardContent>
                <ReportsAnalytics />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card className="bg-card">
              <CardHeader>
                <CardTitle>System Settings</CardTitle>
                <CardDescription>Configure system-wide settings and preferences</CardDescription>
              </CardHeader>
              <CardContent>
                <SettingsManagement />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="affiliates" className="space-y-4">
            <Card className="bg-card">
              <CardHeader>
                <CardTitle>Affiliate Management</CardTitle>
                <CardDescription>Manage affiliate programs and commissions</CardDescription>
              </CardHeader>
              <CardContent>
                <AffiliateManagementTab />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
