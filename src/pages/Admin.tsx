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
  const { user, isAdmin, isSuperAdmin, hasAdminPermission } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(tab);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminInitialized, setAdminInitialized] = useState(false);
  const isUserAdmin = isAdmin();

  // Initialize admin setup on component mount
  useEffect(() => {
    const initializeAdmin = async () => {
      if (!user || !isUserAdmin) {
        setAdminInitialized(true);
        setLoading(false);
        return;
      }
      
      try {
        console.log("Initializing admin setup...");
        const initialized = await ensureAdminUserExists();
        setAdminInitialized(true);
        console.log("Initialization result:", initialized);
      } catch (error) {
        console.error("Failed to initialize admin:", error);
        setAdminInitialized(true);
        toast.error("Admin initialization completed with warnings");
      }
    };

    initializeAdmin();
  }, [user, isUserAdmin]);

  useEffect(() => {
    const loadUsers = async () => {
      if (!adminInitialized || !isUserAdmin) {
        console.log("Waiting for admin initialization or admin rights...");
        if (adminInitialized && !isUserAdmin) setLoading(false);
        return;
      }

      try {
        console.log("Loading users for Admin page...");
        setLoading(true);
        const fetchedUsers = await fetchUsersFromDatabase();
        console.log("Fetched users for Admin page:", fetchedUsers);
        setUsers(fetchedUsers);
        
        if (fetchedUsers.length === 0 && activeTab === 'users') {
          toast.info("No users found. You may need to create user profiles first.");
        } else if (fetchedUsers.length > 0) {
          toast.success(`Loaded ${fetchedUsers.length} users successfully`);
        }
      } catch (error: any) {
        console.error("Failed to load users on Admin page:", error);
        toast.error("Failed to load users", {
          description: error.message || "There was an error loading user data"
        });
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };
    
    if (adminInitialized && isUserAdmin) {
      loadUsers();
    } else if (adminInitialized && !isUserAdmin) {
      setLoading(false);
      setUsers([]);
    }
  }, [adminInitialized, isUserAdmin]);

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
    if (!isSuperAdmin() && !hasAdminPermission(value)) {
      toast.error("You don't have permission to access this section");
      return;
    }
    
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

  const getAvailableTabs = () => {
    const allTabs = [
      { id: 'users', label: 'Users', icon: Users, permission: 'users' },
      { id: 'admins', label: 'Admins', icon: ShieldCheck, permission: 'admins' },
      { id: 'genres', label: 'Genres', icon: Music, permission: 'genres' },
      { id: 'custom-songs', label: 'Custom Songs', icon: Music, permission: 'custom-songs' },
      { id: 'suno-api', label: 'Suno API', icon: Key, permission: 'suno-api' },
      { id: 'contest', label: 'Contest', icon: Trophy, permission: 'contest' },
      { id: 'content', label: 'Content', icon: FileText, permission: 'content' },
      { id: 'payments', label: 'Payments', icon: DollarSign, permission: 'payments' },
      { id: 'support', label: 'Support', icon: Users, permission: 'support' },
      { id: 'reports', label: 'Reports', icon: BarChart, permission: 'reports' },
      { id: 'settings', label: 'Settings', icon: Settings, permission: 'settings' }
    ];

    if (isSuperAdmin()) {
      return allTabs;
    }

    return allTabs.filter(tab => hasAdminPermission(tab.permission));
  };

  if (!isUserAdmin && adminInitialized) {
    return <Navigate to="/dashboard" replace />;
  }

  if (loading && !adminInitialized) {
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

  const availableTabs = getAvailableTabs();

  const adminUsersList = users.filter(u => u.role === 'admin' || u.role === 'super_admin');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {isSuperAdmin() ? 'Super Admin Dashboard' : 'Admin Dashboard'}
          </h1>
          <p className="text-muted-foreground">
            {isSuperAdmin() 
              ? 'Manage all aspects of your MelodyVerse platform' 
              : 'Manage your assigned sections of MelodyVerse'
            }
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <div className="border-b">
          <div className="flex overflow-x-auto py-2 px-4">
            <TabsList className="inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground">
              {availableTabs.map((tabInfo) => (
                <TabsTrigger 
                  key={tabInfo.id} 
                  value={tabInfo.id} 
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium"
                >
                  <tabInfo.icon className="mr-2 h-4 w-4" />
                  {tabInfo.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </div>
        
        <div className="mt-6">
          {availableTabs.map((tabInfo) => (
            <TabsContent key={tabInfo.id} value={tabInfo.id} className="mt-0">
              {tabInfo.id === 'users' && (
                loading ? (
                  <div className="flex justify-center p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-melody-primary"></div>
                    <span className="ml-2">Loading users...</span>
                  </div>
                ) : (
                  <UserManagement 
                    users={users} 
                    renderStatusLabel={renderStatusLabel}
                  />
                )
              )}
              {tabInfo.id === 'admins' && (
                loading ? (
                  <div className="flex justify-center p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-melody-primary"></div>
                    <span className="ml-2">Loading admins...</span>
                  </div>
                ) : (
                  <AdminManagement users={adminUsersList} renderStatusLabel={renderStatusLabel} />
                )
              )}
              {tabInfo.id === 'genres' && <GenreManagement />}
              {tabInfo.id === 'custom-songs' && <ContentManagement />}
              {tabInfo.id === 'suno-api' && <SunoApiManagement />}
              {tabInfo.id === 'contest' && <ContestManagement />}
              {tabInfo.id === 'content' && <ContentManagement />}
              {tabInfo.id === 'payments' && <PaymentManagement />}
              {tabInfo.id === 'support' && <SupportManagement />}
              {tabInfo.id === 'reports' && <ReportsAnalytics />}
              {tabInfo.id === 'settings' && <SettingsManagement />}
            </TabsContent>
          ))}
        </div>
      </Tabs>
    </div>
  );
};

export default Admin;
