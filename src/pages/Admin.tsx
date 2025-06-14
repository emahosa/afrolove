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
    // Check permissions for ordinary admins
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

  // Filter available tabs based on permissions
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

    // Super admin can see all tabs
    if (isSuperAdmin()) {
      return allTabs;
    }

    // Regular admin can only see tabs they have permission for
    return allTabs.filter(tab => hasAdminPermission(tab.permission));
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

  const availableTabs = getAvailableTabs();

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
              {availableTabs.map((tab) => (
                <TabsTrigger 
                  key={tab.id} 
                  value={tab.id} 
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium"
                >
                  <tab.icon className="mr-2 h-4 w-4" />
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </div>
        
        <div className="mt-6">
          {availableTabs.map((tab) => (
            <TabsContent key={tab.id} value={tab.id} className="mt-0">
              {tab.id === 'users' && (
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
              {tab.id === 'admins' && <AdminManagement users={users} renderStatusLabel={renderStatusLabel} />}
              {tab.id === 'genres' && <GenreManagement />}
              {tab.id === 'custom-songs' && <ContentManagement />}
              {tab.id === 'suno-api' && <SunoApiManagement />}
              {tab.id === 'contest' && <ContestManagement />}
              {tab.id === 'content' && <ContentManagement />}
              {tab.id === 'payments' && <PaymentManagement />}
              {tab.id === 'support' && <SupportManagement />}
              {tab.id === 'reports' && <ReportsAnalytics />}
              {tab.id === 'settings' && <SettingsManagement />}
            </TabsContent>
          ))}
        </div>
      </Tabs>
    </div>
  );
};

export default Admin;
