
import { useState, ReactNode, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Check, Users, ShieldCheck, Music, Trophy, FileText, DollarSign, Headphones, BarChart, Settings, Star } from 'lucide-react';
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

// Mock data
const users = [
  { id: 1, name: 'John Doe', email: 'john@example.com', status: 'active', role: 'user', credits: 10, joinDate: '2025-01-15' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', status: 'active', role: 'user', credits: 5, joinDate: '2025-02-20' },
  { id: 3, name: 'Robert Johnson', email: 'robert@example.com', status: 'suspended', role: 'user', credits: 0, joinDate: '2025-03-10' },
];

const admins = [
  { id: 101, name: 'Admin User', email: 'admin@example.com', role: 'admin', permissions: 'full', lastActive: '2025-04-27' },
  { id: 102, name: 'Support Admin', email: 'support@example.com', role: 'moderator', permissions: 'limited', lastActive: '2025-04-25' },
];

const apiKeys = [
  { id: 1, name: 'AI Music Generation', key: '******************************ABCD', status: 'active' },
  { id: 2, name: 'Voice Cloning (Eleven Labs)', key: '******************************EFGH', status: 'inactive' },
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

  // Update the active tab when the URL changes
  useEffect(() => {
    // Extract the tab from the URL path
    const pathSegments = location.pathname.split('/');
    const lastSegment = pathSegments[pathSegments.length - 1];
    
    // Map URL segments to tab values
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
      'settings': 'settings'
    };
    
    const newTab = tabMapping[lastSegment] || 'users';
    if (newTab !== activeTab) {
      setActiveTab(newTab);
    }
  }, [location.pathname, activeTab]);

  // Handle tab change and navigation
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    
    // Map tab values to URL paths
    const tabToUrlMapping: Record<string, string> = {
      'users': '/admin/users',
      'admins': '/admin/admins',
      'apis': '/admin/api-keys',
      'contest': '/admin/contest',
      'content': '/admin/content',
      'payments': '/admin/payments',
      'support': '/admin/support',
      'reports': '/admin/reports',
      'settings': '/admin/settings',
    };
    
    // Navigate to the corresponding URL
    const targetUrl = tabToUrlMapping[value];
    if (targetUrl) {
      navigate(targetUrl);
    }
  };

  if (!isAdmin()) {
    toast.error("You don't have admin permissions");
    return <Navigate to="/dashboard" />;
  }

  const getCheckboxIcon = (included: boolean): ReactNode => {
    return included ? (
      <div className="h-5 w-5 rounded-full bg-green-500 flex items-center justify-center">
        <Check className="h-3 w-3 text-white" />
      </div>
    ) : (
      <div className="h-5 w-5 rounded-full border border-muted-foreground" />
    );
  };

  const renderPlanFeatures = (features: { label: string; included: boolean }[]): ReactNode => {
    return features.map((feature, index) => renderCheckbox(feature, index));
  };

  const renderCheckbox = (feature: { label: string; included: boolean }, index: number): ReactNode => {
    return (
      <div key={index} className="flex items-center gap-2 py-1">
        {getCheckboxIcon(feature.included)}
        <span className={feature.included ? 'text-foreground' : 'text-muted-foreground'}>
          {feature.label}
        </span>
      </div>
    );
  };

  const getButtonContent = (status: string): ReactNode => {
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

  const renderStatusLabel = (status: string): ReactNode => {
    const statusClasses: Record<string, string> = {
      active: "text-green-500",
      suspended: "text-amber-500",
      pending: "text-blue-500",
      approved: "text-green-500",
    };
    
    const statusClass = statusClasses[status] || "text-gray-500";
    
    return <span className={statusClass}>{status}</span>;
  };

  const handleNotImplemented = () => {
    toast.info("This feature is not yet implemented");
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
            <UserManagement users={users} renderStatusLabel={renderStatusLabel} />
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
            <div className="p-6 text-center bg-muted rounded-lg">
              <h3 className="text-xl font-medium mb-2">Content Management</h3>
              <p className="text-muted-foreground mb-4">Manage your platform's content and media assets</p>
              <Button onClick={handleNotImplemented}>Initialize Content Manager</Button>
            </div>
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
            <div className="p-6 text-center bg-muted rounded-lg">
              <h3 className="text-xl font-medium mb-2">Customer Support</h3>
              <p className="text-muted-foreground mb-4">Manage support tickets and user inquiries</p>
              <Button onClick={handleNotImplemented}>Open Support Dashboard</Button>
            </div>
          </TabsContent>

          <TabsContent value="reports" className="mt-0">
            <div className="p-6 text-center bg-muted rounded-lg">
              <h3 className="text-xl font-medium mb-2">Reports & Analytics</h3>
              <p className="text-muted-foreground mb-4">View platform analytics and generate reports</p>
              <Button onClick={handleNotImplemented}>Generate Report</Button>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="mt-0">
            <div className="p-6 text-center bg-muted rounded-lg">
              <h3 className="text-xl font-medium mb-2">System Settings</h3>
              <p className="text-muted-foreground mb-4">Configure platform settings and preferences</p>
              <Button onClick={handleNotImplemented}>Update Settings</Button>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default Admin;
