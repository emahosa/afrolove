
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Users, ShieldCheck, Music, Trophy, FileText, DollarSign, Headphones, BarChart, Settings, RefreshCcw, Bug, Key } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';

// Components
import { UserManagement } from '@/components/admin/UserManagement';
import { AdminManagement } from '@/components/admin/AdminManagement';
import { SunoApiManagement } from '@/components/admin/SunoApiManagement';
import { ContestManagement } from '@/components/admin/ContestManagement';
import { PaymentManagement } from '@/components/admin/PaymentManagement';
import { ContentManagement } from '@/components/admin/ContentManagement';
import { SupportManagement } from '@/components/admin/SupportManagement';
import { ReportsAnalytics } from '@/components/admin/ReportsAnalytics';
import { SettingsManagement } from '@/components/admin/SettingsManagement';
import { GenreManagement } from '@/components/admin/GenreManagement';
import { fetchUsersFromDatabase, ensureAdminUserExists } from '@/utils/adminOperations';

interface AdminProps {
  tab?: string;
}

const Admin = ({ tab = 'users' }: AdminProps) => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(tab);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminInitialized, setAdminInitialized] = useState(false);

  // Check admin access first
  if (!isAdmin()) {
    console.log("User is not admin, redirecting");
    toast.error("You don't have admin permissions");
    return <Navigate to="/dashboard" />;
  }

  // Initialize admin setup on component mount
  useEffect(() => {
    const initializeAdmin = async () => {
      if (!user) return;
      
      try {
        console.log("Initializing admin setup...");
        const initialized = await ensureAdminUserExists();
        setAdminInitialized(true);
        console.log("Initialization result:", initialized);
        
        if (initialized) {
          toast.success("Admin setup verified");
        }
      } catch (error) {
        console.error("Failed to initialize admin:", error);
        setAdminInitialized(true);
        toast.error("Admin initialization completed with warnings");
      }
    };

    if (user && isAdmin()) {
      initializeAdmin();
    }
  }, [user, isAdmin]);

  useEffect(() => {
    const loadUsers = async () => {
      if (!adminInitialized) {
        console.log("Waiting for admin initialization...");
        return;
      }

      try {
        console.log("Loading users...");
        setLoading(true);
        const fetchedUsers = await fetchUsersFromDatabase();
        console.log("Fetched users:", fetchedUsers);
        setUsers(fetchedUsers);
        
        if (fetchedUsers.length === 0) {
          toast.info("No users found. You may need to create user profiles first.");
        } else {
          toast.success(`Loaded ${fetchedUsers.length} users successfully`);
        }
      } catch (error: any) {
        console.error("Failed to load users:", error);
        toast.error("Failed to load users", {
          description: error.message || "There was an error loading user data"
        });
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };
    
    if (activeTab === 'users' && adminInitialized) {
      loadUsers();
    } else if (adminInitialized) {
      setLoading(false);
    }
  }, [activeTab, adminInitialized]);

  useEffect(() => {
    const pathSegments = location.pathname.split('/');
    const lastSegment = pathSegments[pathSegments.length - 1];
    
    const tabMapping: Record<string, string> = {
      'admin': 'users',
      'users': 'users',
      'admins': 'admins',
      'api-keys': 'suno-api',
      'suno-api': 'suno-api',
      'contest': 'contest',
      'content': 'content',
      'payments': 'payments',
      'support': 'support',
      'reports': 'reports',
      'settings': 'settings',
      'custom-songs': 'custom-songs',
      'genres': 'genres'
    };
    
    const newTab = tabMapping[lastSegment] || 'users';
    if (newTab !== activeTab) {
      setActiveTab(newTab);
      
      if (lastSegment === 'api-keys') {
        navigate('/admin/suno-api', { replace: true });
      }
    }
  }, [location.pathname, activeTab, navigate]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    
    const tabToUrlMapping: Record<string, string> = {
      'users': '/admin/users',
      'admins': '/admin/admins',
      'genres': '/admin/genres',
      'custom-songs': '/admin/custom-songs',
      'suno-api': '/admin/suno-api',
      'contest': '/admin/contest',
      'content': '/admin/content',
      'payments': '/admin/payments',
      'support': '/admin/support',
      'reports': '/admin/reports',
      'settings': '/admin/settings',
    };
    
    const targetUrl = tabToUrlMapping[value];
    if (targetUrl) {
      navigate(targetUrl);
    }
  };

  if (!adminInitialized && loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-melody-secondary"></div>
        <div className="ml-3">Initializing admin panel...</div>
      </div>
    );
  }

  const renderStatusLabel = (status: string): React.ReactNode => {
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${
        status === 'active' ? 'bg-green-100 text-green-800' :
        status === 'suspended' ? 'bg-red-100 text-red-800' :
        'bg-gray-100 text-gray-800'
      }`}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage all aspects of your MelodyVerse platform</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <div className="border-b">
          <div className="flex overflow-x-auto py-2 px-4">
            <TabsList className="inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground">
              <TabsTrigger value="users" className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium">
                <Users className="mr-2 h-4 w-4" />
                Users
              </TabsTrigger>
              <TabsTrigger value="admins" className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium">
                <ShieldCheck className="mr-2 h-4 w-4" />
                Admins
              </TabsTrigger>
              <TabsTrigger value="genres" className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium">
                <Music className="mr-2 h-4 w-4" />
                Genres
              </TabsTrigger>
              <TabsTrigger value="custom-songs" className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium">
                <Music className="mr-2 h-4 w-4" />
                Custom Songs
              </TabsTrigger>
              <TabsTrigger value="suno-api" className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium">
                <Key className="mr-2 h-4 w-4" />
                Suno API
              </TabsTrigger>
              <TabsTrigger value="contest" className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium">
                <Trophy className="mr-2 h-4 w-4" />
                Contest
              </TabsTrigger>
              <TabsTrigger value="content" className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium">
                <FileText className="mr-2 h-4 w-4" />
                Content
              </TabsTrigger>
              <TabsTrigger value="payments" className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium">
                <DollarSign className="mr-2 h-4 w-4" />
                Payments
              </TabsTrigger>
              <TabsTrigger value="support" className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium">
                <Users className="mr-2 h-4 w-4" />
                Support
              </TabsTrigger>
              <TabsTrigger value="reports" className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium">
                <BarChart className="mr-2 h-4 w-4" />
                Reports
              </TabsTrigger>
              <TabsTrigger value="settings" className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </TabsTrigger>
            </TabsList>
          </div>
        </div>
        
        <div className="mt-6">
          <TabsContent value="users" className="mt-0">
            {loading ? (
              <div className="flex justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-melody-primary"></div>
                <span className="ml-2">Loading users...</span>
              </div>
            ) : (
              <UserManagement 
                users={users} 
                renderStatusLabel={renderStatusLabel}
              />
            )}
          </TabsContent>

          <TabsContent value="admins" className="mt-0">
            <AdminManagement 
              users={users}
              admins={[]}
              apiKeys={[]}
              contestEntries={[]}
              pricingPlans={[]}
              creditPackages={[]}
              renderStatusLabel={renderStatusLabel}
              renderPlanFeatures={() => null}
              getButtonContent={(status: string) => status}
            />
          </TabsContent>

          <TabsContent value="genres" className="mt-0">
            <GenreManagement />
          </TabsContent>

          <TabsContent value="custom-songs" className="mt-0">
            <ContentManagement />
          </TabsContent>

          <TabsContent value="suno-api" className="mt-0">
            <SunoApiManagement />
          </TabsContent>

          <TabsContent value="contest" className="mt-0">
            <ContestManagement 
              contestEntries={[]} 
              renderStatusLabel={renderStatusLabel}
            />
          </TabsContent>

          <TabsContent value="content" className="mt-0">
            <ContentManagement />
          </TabsContent>

          <TabsContent value="payments" className="mt-0">
            <PaymentManagement 
              pricingPlans={[]}
              creditPackages={[]}
              renderPlanFeatures={() => null}
              renderStatusLabel={renderStatusLabel}
            />
          </TabsContent>

          <TabsContent value="support" className="mt-0">
            <SupportManagement />
          </TabsContent>

          <TabsContent value="reports" className="mt-0">
            <ReportsAnalytics />
          </TabsContent>

          <TabsContent value="settings" className="mt-0">
            <SettingsManagement />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default Admin;
