import { useState, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { NavigateFunction, Navigate, useNavigate } from 'react-router-dom';
import { Check, Users, ShieldCheck, Music, Trophy, FileText, DollarSign, Headphones, BarChart, Settings } from 'lucide-react';

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

// Add fixed prices for credit packages
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
  const navigate: NavigateFunction = useNavigate();
  const [activeTab, setActiveTab] = useState(tab);

  // Redirect if not admin
  if (!isAdmin()) {
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
    const statusClasses = {
      active: "text-green-500",
      suspended: "text-amber-500",
      pending: "text-blue-500",
      approved: "text-green-500",
    };
    
    const statusClass = statusClasses[status as keyof typeof statusClasses] || "text-gray-500";
    
    return <span className={statusClass}>{status}</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage all aspects of your MelodyVerse platform</p>
        </div>
      </div>

      <Tabs defaultValue={activeTab} value={activeTab} onValueChange={setActiveTab}>
        <div className="border-b">
          <div className="flex overflow-x-auto py-2 px-4">
            <TabsList className="inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground">
              <TabsTrigger
                value="users"
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow"
                onClick={() => navigate('/admin/users')}
              >
                <Users className="mr-2 h-4 w-4" />
                Users
              </TabsTrigger>
              <TabsTrigger
                value="admins"
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow"
                onClick={() => navigate('/admin/admins')}
              >
                <ShieldCheck className="mr-2 h-4 w-4" />
                Admins
              </TabsTrigger>
              <TabsTrigger
                value="custom-songs"
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow"
                onClick={() => navigate('/admin/custom-songs')}
              >
                <Music className="mr-2 h-4 w-4" />
                Custom Songs
              </TabsTrigger>
              <TabsTrigger
                value="contest"
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow"
                onClick={() => navigate('/admin/contest')}
              >
                <Trophy className="mr-2 h-4 w-4" />
                Contest
              </TabsTrigger>
              <TabsTrigger
                value="content"
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow"
                onClick={() => navigate('/admin/content')}
              >
                <FileText className="mr-2 h-4 w-4" />
                Content
              </TabsTrigger>
              <TabsTrigger
                value="apis"
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow"
                onClick={() => navigate('/admin/api-keys')}
              >
                <Headphones className="mr-2 h-4 w-4" />
                API Keys
              </TabsTrigger>
              <TabsTrigger
                value="payments"
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow"
                onClick={() => navigate('/admin/payments')}
              >
                <DollarSign className="mr-2 h-4 w-4" />
                Payments
              </TabsTrigger>
              <TabsTrigger
                value="reports"
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow"
                onClick={() => navigate('/admin/reports')}
              >
                <BarChart className="mr-2 h-4 w-4" />
                Reports
              </TabsTrigger>
              <TabsTrigger
                value="settings"
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow"
                onClick={() => navigate('/admin/settings')}
              >
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </TabsTrigger>
            </TabsList>
          </div>
        </div>
        
        <div className="mt-6">
          <TabsContent value="users" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">User Management</h2>
              <Button>Add New User</Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Name</th>
                    <th className="text-left py-3 px-4">Email</th>
                    <th className="text-left py-3 px-4">Status</th>
                    <th className="text-left py-3 px-4">Role</th>
                    <th className="text-left py-3 px-4">Credits</th>
                    <th className="text-left py-3 px-4">Joined</th>
                    <th className="text-right py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b">
                      <td className="py-3 px-4">{user.name}</td>
                      <td className="py-3 px-4">{user.email}</td>
                      <td className="py-3 px-4">{renderStatusLabel(user.status)}</td>
                      <td className="py-3 px-4">{user.role}</td>
                      <td className="py-3 px-4">{user.credits}</td>
                      <td className="py-3 px-4">{user.joinDate}</td>
                      <td className="py-3 px-4 text-right">
                        <Button variant="ghost" size="sm" className="h-8 px-2">
                          Edit
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 px-2">
                          Ban
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="admins" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Admin Management</h2>
              <Button>Add New Admin</Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Name</th>
                    <th className="text-left py-3 px-4">Email</th>
                    <th className="text-left py-3 px-4">Role</th>
                    <th className="text-left py-3 px-4">Permissions</th>
                    <th className="text-left py-3 px-4">Last Active</th>
                    <th className="text-right py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {admins.map((admin) => (
                    <tr key={admin.id} className="border-b">
                      <td className="py-3 px-4">{admin.name}</td>
                      <td className="py-3 px-4">{admin.email}</td>
                      <td className="py-3 px-4">{admin.role}</td>
                      <td className="py-3 px-4">{admin.permissions}</td>
                      <td className="py-3 px-4">{admin.lastActive}</td>
                      <td className="py-3 px-4 text-right">
                        <Button variant="ghost" size="sm" className="h-8 px-2">
                          Edit
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 px-2">
                          Remove
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="apis" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">API Key Management</h2>
              <Button>Add New API</Button>
            </div>
            <div className="grid gap-4">
              {apiKeys.map((api) => (
                <Card key={api.id}>
                  <CardHeader className="pb-2">
                    <CardTitle>{api.name}</CardTitle>
                    <CardDescription>API Integration</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">API Key</div>
                        <div className="font-mono text-sm">{api.key}</div>
                      </div>
                      <div className="flex flex-col md:flex-row gap-2">
                        <Button variant="outline" size="sm">
                          Reveal Key
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className={api.status === "active" ? "text-green-500" : "text-muted-foreground"}
                        >
                          {getButtonContent(api.status)}
                        </Button>
                        <Button variant="outline" size="sm">
                          Regenerate
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="contest" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Contest Management</h2>
              <Button>Create New Contest</Button>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Current Contest: Summer Hits 2025</CardTitle>
                <CardDescription>Active until June 30, 2025</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <h3 className="text-lg font-medium mb-2">Contest Entries</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4">User</th>
                          <th className="text-left py-3 px-4">Title</th>
                          <th className="text-left py-3 px-4">Votes</th>
                          <th className="text-left py-3 px-4">Status</th>
                          <th className="text-right py-3 px-4">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {contestEntries.map((entry) => (
                          <tr key={entry.id} className="border-b">
                            <td className="py-3 px-4">{entry.user}</td>
                            <td className="py-3 px-4">{entry.title}</td>
                            <td className="py-3 px-4">{entry.votes}</td>
                            <td className="py-3 px-4">{renderStatusLabel(entry.status)}</td>
                            <td className="py-3 px-4 text-right">
                              <Button variant="ghost" size="sm" className="h-8 px-2">
                                View
                              </Button>
                              {entry.status === 'pending' ? (
                                <Button variant="ghost" size="sm" className="h-8 px-2 text-green-500">
                                  Approve
                                </Button>
                              ) : (
                                <Button variant="ghost" size="sm" className="h-8 px-2 text-amber-500">
                                  Revoke
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="flex justify-between">
                  <Button variant="outline">End Contest</Button>
                  <Button>Choose Winner</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="payments" className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">Pricing Plans</h2>
                <Button>Add New Plan</Button>
              </div>
              
              <div className="grid gap-6 md:grid-cols-3">
                {pricingPlans.map((plan) => (
                  <Card key={plan.id} className={plan.popular ? "border-melody-secondary" : ""}>
                    {plan.popular && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <div className="bg-melody-secondary text-white text-xs px-3 py-1 rounded-full">
                          Popular
                        </div>
                      </div>
                    )}
                    <CardHeader>
                      <CardTitle>{plan.name}</CardTitle>
                      <CardDescription>Subscription Plan</CardDescription>
                      <div className="mt-4 text-3xl font-bold">${plan.price}<span className="text-sm text-muted-foreground font-normal">/month</span></div>
                    </CardHeader>
                    <CardContent className="flex-1">
                      <div className="mb-4 flex items-center gap-2">
                        <Star className="h-5 w-5 text-melody-secondary" />
                        <span className="font-medium">{plan.credits} monthly credits</span>
                      </div>
                      <div className="space-y-2">
                        {renderPlanFeatures(plan.features)}
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button className="w-full">Edit Plan</Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">Credit Packages</h2>
                <Button>Add New Package</Button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">Package Name</th>
                      <th className="text-left py-3 px-4">Credits</th>
                      <th className="text-left py-3 px-4">Price</th>
                      <th className="text-left py-3 px-4">Status</th>
                      <th className="text-right py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {creditPackages.map((pkg) => (
                      <tr key={pkg.id} className="border-b">
                        <td className="py-3 px-4">{pkg.name}</td>
                        <td className="py-3 px-4">{pkg.credits}</td>
                        <td className="py-3 px-4">${pkg.price.toFixed(2)}</td>
                        <td className="py-3 px-4">{renderStatusLabel(pkg.status)}</td>
                        <td className="py-3 px-4 text-right">
                          <Button variant="ghost" size="sm" className="h-8 px-2">
                            Edit
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 px-2 text-red-500">
                            Disable
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
          
        </div>
      </Tabs>
    </div>
  );
};

export default Admin;
