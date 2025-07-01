import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

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
  const [activeTab, setActiveTab] = useState(tab || "users");

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

    checkAdminStatus();
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
    <div className="container mx-auto py-8 px-4 md:px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Manage users, content, and system settings
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-6 lg:grid-cols-11">
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
          <GenreManagement />
        </TabsContent>

        <TabsContent value="suno-api" className="space-y-4">
          <SunoApiManagement />
        </TabsContent>

        <TabsContent value="contest" className="space-y-4">
          <ContestManagement />
        </TabsContent>

        <TabsContent value="content" className="space-y-4">
          <ContentManagement />
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <PaymentManagement />
        </TabsContent>

        <TabsContent value="support" className="space-y-4">
          <SupportManagement />
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <ReportsAnalytics />
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <SettingsManagement />
        </TabsContent>

        <TabsContent value="affiliates" className="space-y-4">
          <AffiliateManagementTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;
