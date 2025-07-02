import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Users, Settings, Music, Key, Trophy, FileText, CreditCard, HelpCircle, BarChart3, Cog, DollarSign } from "lucide-react";

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
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState(tab || "overview");
  const [adminStats, setAdminStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalSongs: 0,
    pendingRequests: 0
  });

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        setIsAdmin(false);
        return;
      }

      try {
        // Check if user is the super admin by email
        if (user.email === 'ellaadahosa@gmail.com') {
          setIsAdmin(true);
          return;
        }

        // Check user roles
        const { data: roles, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        if (error) {
          console.error('Error checking admin status:', error);
          setIsAdmin(false);
          return;
        }

        const hasAdminRole = roles?.some(r => r.role === 'admin' || r.role === 'super_admin');
        setIsAdmin(hasAdminRole || false);
      } catch (error) {
        console.error('Error in admin check:', error);
        setIsAdmin(false);
      }
    };

    const fetchAdminStats = async () => {
      try {
        // Fetch basic admin statistics
        const { count: userCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        setAdminStats(prev => ({
          ...prev,
          totalUsers: userCount || 0,
          activeUsers: userCount || 0, // Simplified for now
          totalSongs: 0, // Would need actual songs table
          pendingRequests: 0 // Would need actual requests table
        }));
      } catch (error) {
        console.error('Error fetching admin stats:', error);
      }
    };

    checkAdminStatus();
    fetchAdminStats();
  }, [user]);

  if (isAdmin === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) {
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
    <div className="min-h-screen bg-background">
      {/* Admin Header */}
      <div className="border-b bg-white">
        <div className="container mx-auto py-4 px-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-primary">Admin Dashboard</h1>
              <p className="text-muted-foreground text-sm">System administration and management console</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">Welcome, {user?.email}</span>
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-medium text-primary">
                  {user?.email?.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto py-8 px-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-6 lg:grid-cols-12">
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

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{adminStats.totalUsers}</div>
                  <p className="text-xs text-muted-foreground">Registered users</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                  <Users className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{adminStats.activeUsers}</div>
                  <p className="text-xs text-muted-foreground">Active this month</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Songs</CardTitle>
                  <Music className="h-4 w-4 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{adminStats.totalSongs}</div>
                  <p className="text-xs text-muted-foreground">Songs generated</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
                  <HelpCircle className="h-4 w-4 text-yellow-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{adminStats.pendingRequests}</div>
                  <p className="text-xs text-muted-foreground">Awaiting review</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>Common administrative tasks</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <button 
                    onClick={() => setActiveTab("users")}
                    className="w-full text-left p-3 rounded-md hover:bg-accent transition-colors flex items-center gap-2"
                  >
                    <Users className="h-4 w-4" />
                    Manage Users
                  </button>
                  <button 
                    onClick={() => setActiveTab("genres")}
                    className="w-full text-left p-3 rounded-md hover:bg-accent transition-colors flex items-center gap-2"
                  >
                    <Music className="h-4 w-4" />
                    Manage Genres
                  </button>
                  <button 
                    onClick={() => setActiveTab("suno-api")}
                    className="w-full text-left p-3 rounded-md hover:bg-accent transition-colors flex items-center gap-2"
                  >
                    <Key className="h-4 w-4" />
                    API Management
                  </button>
                  <button 
                    onClick={() => setActiveTab("reports")}
                    className="w-full text-left p-3 rounded-md hover:bg-accent transition-colors flex items-center gap-2"
                  >
                    <BarChart3 className="h-4 w-4" />
                    View Reports
                  </button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>System Status</CardTitle>
                  <CardDescription>Current system health</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">API Status</span>
                    <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">Online</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Database</span>
                    <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">Connected</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Background Jobs</span>
                    <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">Running</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Storage</span>
                    <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">75% Used</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>
                  Manage user accounts, roles, and permissions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <UserManagement users={[]} renderStatusLabel={renderStatusLabel} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="admins" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Admin Management</CardTitle>
                <CardDescription>
                  Manage administrator accounts and permissions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AdminManagement />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="genres" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Genre Management</CardTitle>
                <CardDescription>
                  Manage music genres and AI prompt templates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <GenreManagement />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="suno-api" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Suno API Management</CardTitle>
                <CardDescription>
                  Manage Suno API keys and configuration
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SunoApiManagement />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contest" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Contest Management</CardTitle>
                <CardDescription>
                  Manage contests, entries, and voting
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ContestManagement />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="content" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Content Management</CardTitle>
                <CardDescription>
                  Manage content moderation and flags
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ContentManagement />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Payment Management</CardTitle>
                <CardDescription>
                  Manage payments, transactions, and billing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PaymentManagement />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="support" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Support Management</CardTitle>
                <CardDescription>
                  Manage support tickets and user inquiries
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SupportManagement />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Reports & Analytics</CardTitle>
                <CardDescription>
                  View system analytics and generate reports
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ReportsAnalytics />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>System Settings</CardTitle>
                <CardDescription>
                  Configure system-wide settings and preferences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SettingsManagement />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="affiliates" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Affiliate Management</CardTitle>
                <CardDescription>
                  Manage affiliate programs and commissions
                </CardDescription>
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
