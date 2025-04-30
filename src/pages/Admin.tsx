import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Users, ShieldCheck, Music, Trophy, FileText, DollarSign, Headphones, BarChart, Settings, RefreshCcw, Bug } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';

// Components
import { UserManagement } from '@/components/admin/UserManagement';
import { AdminManagement } from '@/components/admin/AdminManagement';
import { ApiKeyManagement } from '@/components/admin/ApiKeyManagement';
import { ContestManagement } from '@/components/admin/ContestManagement';
import { PaymentManagement } from '@/components/admin/PaymentManagement';
import { ContentManagement } from '@/components/admin/ContentManagement';
import { SupportManagement } from '@/components/admin/SupportManagement';
import { ReportsAnalytics } from '@/components/admin/ReportsAnalytics';
import { SettingsManagement } from '@/components/admin/SettingsManagement';
import { fetchUsersFromDatabase } from '@/utils/adminOperations';
import { debugCreditsSystem } from '@/utils/supabaseDebug';

// Mock data for other sections
const admins = [
  { id: 101, name: 'Admin User', email: 'admin@example.com', role: 'admin', permissions: 'full', lastActive: '2025-04-27' },
  { id: 102, name: 'Support Admin', email: 'support@example.com', role: 'moderator', permissions: 'limited', lastActive: '2025-04-25' },
];

// Mock data
const apiKeys = [
  { 
    id: 1, 
    provider: 'suno', 
    name: 'Suno Music Generation', 
    key: 'suno_prod_3bea4912aefg01234567890', 
    status: 'active',
    lastVerified: '2025-04-27T14:30:00Z'
  },
  { 
    id: 2, 
    provider: 'elevenlabs', 
    name: 'ElevenLabs Voice Cloning', 
    key: 'el_11b234a56cd7890abcdef123456', 
    status: 'inactive' 
  },
];

const contestEntries = [
  { id: 1, user: 'John Doe', title: 'Summer Vibes', votes: 124, status: 'approved' },
  { id: 2, user: 'Jane Smith', title: 'Midnight Dreams', votes: 89, status: 'pending' },
  { id: 3, user: 'Robert Johnson', title: 'Elevation', votes: 201, status: 'approved' },
];

const pricingPlans = [
  {
    id: 'basic',
    name: 'Basic',
    price: 9.99,
    credits: 20,
    features: [
      { label: 'Generate up to 20 songs', included: true },
      { label: 'Standard audio quality', included: true },
      { label: 'Download MP3 files', included: true },
      { label: 'Voice cloning (1 voice)', included: false },
      { label: 'Split vocals and instruments', included: false },
      { label: 'Priority support', included: false },
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 19.99,
    credits: 50,
    popular: true,
    features: [
      { label: 'Generate up to 50 songs', included: true },
      { label: 'High audio quality', included: true },
      { label: 'Download MP3 & WAV files', included: true },
      { label: 'Voice cloning (3 voices)', included: true },
      { label: 'Split vocals and instruments', included: true },
      { label: 'Priority support', included: false },
    ],
  },
  {
    id: 'pro',
    name: 'Professional',
    price: 39.99,
    credits: 120,
    features: [
      { label: 'Generate up to 120 songs', included: true },
      { label: 'Studio audio quality', included: true },
      { label: 'Download all file formats', included: true },
      { label: 'Unlimited voice cloning', included: true },
      { label: 'Split vocals and instruments', included: true },
      { label: 'Priority support', included: true },
    ],
  },
];

const creditPackages = [
  { id: 'small', name: 'Small Pack', credits: 20, price: 9.99, status: 'active' },
  { id: 'medium', name: 'Medium Pack', credits: 50, price: 19.99, status: 'active' },
  { id: 'large', name: 'Large Pack', credits: 120, price: 39.99, status: 'active' },
];

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
  const [isDebugging, setIsDebugging] = useState(false);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        console.log("Admin component: Loading users...");
        setLoading(true);
        const fetchedUsers = await fetchUsersFromDatabase();
        console.log("Admin component: Fetched users:", fetchedUsers);
        setUsers(fetchedUsers);
      } catch (error) {
        console.error("Failed to load users:", error);
        toast.error("Failed to load users", {
          description: "There was an error loading user data"
        });
      } finally {
        setLoading(false);
      }
    };
    
    // Load users when the component mounts or the active tab changes to 'users'
    if (activeTab === 'users') {
      loadUsers();
    }
  }, [activeTab]);

  useEffect(() => {
    const pathSegments = location.pathname.split('/');
    const lastSegment = pathSegments[pathSegments.length - 1];
    
    const tabMapping: Record<string, string> = {
      'admin': 'users',
      'users': 'users',
      'admins': 'admins',
      'api-keys': 'apis',
      'contest': 'contest',
      'content': 'content',
      'payments': 'payments',
      'support': 'support',
      'reports': 'reports',
      'settings': 'settings',
      'custom-songs': 'custom-songs'
    };
    
    const newTab = tabMapping[lastSegment] || 'users';
    if (newTab !== activeTab) {
      setActiveTab(newTab);
    }
  }, [location.pathname, activeTab]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    
    const tabToUrlMapping: Record<string, string> = {
      'users': '/admin/users',
      'admins': '/admin/admins',
      'custom-songs': '/admin/custom-songs',
      'apis': '/admin/api-keys',
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

  const handleDebugSystem = async () => {
    if (!user) return;
    
    setIsDebugging(true);
    try {
      toast.info("Running system diagnostics...", { duration: 2000 });
      const result = await debugCreditsSystem(user.id);
      console.log("System diagnostics result:", result);
      
      if (result.profileExists) {
        toast.success("Your user profile exists", { 
          description: `Credits: ${result.profileCredits}, Roles: ${result.rolesCount || 0}`
        });
      } else {
        toast.error("Your user profile not found", { 
          description: "This may cause functionality issues" 
        });
      }
      
      // Refresh users list after diagnostics
      if (activeTab === 'users') {
        const fetchedUsers = await fetchUsersFromDatabase();
        setUsers(fetchedUsers);
        toast.info(`Found ${fetchedUsers.length} user profiles`);
      }
    } catch (error) {
      console.error("Error in diagnostics:", error);
      toast.error("Diagnostics failed");
    } finally {
      setIsDebugging(false);
    }
  };

  if (!isAdmin()) {
    toast.error("You don't have admin permissions");
    return <Navigate to="/dashboard" />;
  }

  const renderStatusLabel = (status: string): React.ReactNode => {
    const statusClasses: Record<string, string> = {
      active: "text-green-500",
      suspended: "text-amber-500",
      pending: "text-blue-500",
      approved: "text-green-500",
    };
    
    const statusClass = statusClasses[status] || "text-gray-500";
    
    return <span className={statusClass}>{status}</span>;
  };

  const renderPlanFeatures = (features: { label: string; included: boolean }[]): React.ReactNode => {
    return features.map((feature, index) => (
      <div key={index} className="flex items-center gap-2 py-1">
        {feature.included ? (
          <div className="h-5 w-5 rounded-full bg-green-500 flex items-center justify-center">
            <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        ) : (
          <div className="h-5 w-5 rounded-full border border-muted-foreground" />
        )}
        <span className={feature.included ? 'text-foreground' : 'text-muted-foreground'}>
          {feature.label}
        </span>
      </div>
    ));
  };

  const getButtonContent = (status: string): React.ReactNode => {
    if (status === 'active') {
      return (
        <>
          <span className="h-2 w-2 rounded-full bg-green-500 mr-2"></span>
          Active
        </>
      );
    } else {
      return (
        <>
          <span className="h-2 w-2 rounded-full bg-gray-400 mr-2"></span>
          Inactive
        </>
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage all aspects of your MelodyVerse platform</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleDebugSystem}
            disabled={isDebugging}
            className="flex items-center gap-1"
          >
            <Bug className="w-4 h-4" />
            {isDebugging ? 'Running...' : 'System Diagnostics'}
          </Button>
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
              <TabsTrigger value="custom-songs" className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium"
                onClick={() => navigate('/admin/custom-songs')}>
                <Music className="mr-2 h-4 w-4" />
                Custom Songs
              </TabsTrigger>
              <TabsTrigger value="contest" className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium">
                <Trophy className="mr-2 h-4 w-4" />
                Contest
              </TabsTrigger>
              <TabsTrigger value="content" className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium">
                <FileText className="mr-2 h-4 w-4" />
                Content
              </TabsTrigger>
              <TabsTrigger value="apis" className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium">
                <Headphones className="mr-2 h-4 w-4" />
                API Keys
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
              <UserManagement users={users} renderStatusLabel={renderStatusLabel} />
            )}
          </TabsContent>

          <TabsContent value="admins" className="mt-0">
            <AdminManagement admins={admins} />
          </TabsContent>

          <TabsContent value="apis" className="mt-0">
            <ApiKeyManagement apiKeys={apiKeys} getButtonContent={getButtonContent} />
          </TabsContent>

          <TabsContent value="contest" className="mt-0">
            <ContestManagement contestEntries={contestEntries} renderStatusLabel={renderStatusLabel} />
          </TabsContent>

          <TabsContent value="content" className="mt-0">
            <ContentManagement />
          </TabsContent>

          <TabsContent value="payments" className="mt-0">
            <PaymentManagement 
              pricingPlans={pricingPlans}
              creditPackages={creditPackages}
              renderPlanFeatures={renderPlanFeatures}
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
