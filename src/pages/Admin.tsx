import { useState, useEffect, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  Users as UsersIcon,
  Settings,
  Database,
  Shield,
  Music,
  Trophy,
  Star,
  Key,
  MessageSquare,
  FileText,
  Search,
  Check,
  X,
  Edit,
  Trash2,
  Plus
} from "lucide-react";

interface AdminProps {
  tab?: string;
}

const Admin = ({ tab = "dashboard" }: AdminProps) => {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState(tab);
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Form states
  const [sunoApiKey, setSunoApiKey] = useState("");
  const [elevenLabsApiKey, setElevenLabsApiKey] = useState("");
  const [adminEmails, setAdminEmails] = useState("");
  const [contestPoints, setContestPoints] = useState("100");
  const [contestRules, setContestRules] = useState("1. Submissions must be original\n2. Maximum song length: 3 minutes\n3. No explicit content");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [ticketFilter, setTicketFilter] = useState("open");

  // Mock data for user management
  const [users, setUsers] = useState([
    { id: "1", name: "John Doe", email: "john@example.com", credits: 25, plan: "Premium", status: "Active" },
    { id: "2", name: "Sarah Smith", email: "sarah@example.com", credits: 10, plan: "Basic", status: "Active" },
    { id: "3", name: "Michael Brown", email: "mike@example.com", credits: 50, plan: "Premium", status: "Active" },
    { id: "4", name: "Emma Wilson", email: "emma@example.com", credits: 0, plan: "Free", status: "Suspended" },
    { id: "5", name: "David Johnson", email: "david@example.com", credits: 15, plan: "Basic", status: "Active" },
  ]);

  // Mock data for admin management
  const [admins, setAdmins] = useState([
    { id: "1", name: "Admin User", email: "admin@example.com", role: "Super Admin" },
    { id: "2", name: "Jane Doe", email: "jane@example.com", role: "Admin" },
    { id: "3", name: "Robert Smith", email: "robert@example.com", role: "Admin" },
  ]);

  // Mock data for content management
  const [content, setContent] = useState([
    { id: "1", title: "Summer Vibes", type: "Song", user: "john@example.com", created: "2023-04-15" },
    { id: "2", title: "Electronic Beat 03", type: "Instrumental", user: "admin@example.com", created: "2023-04-12" },
    { id: "3", title: "Sarah's Voice", type: "Voice Clone", user: "sarah@example.com", created: "2023-04-10" },
    { id: "4", title: "Rock Anthem", type: "Song", user: "mike@example.com", created: "2023-04-08" },
    { id: "5", title: "Lo-Fi Background", type: "Instrumental", user: "admin@example.com", created: "2023-04-05" },
  ]);

  // Mock data for contest entries
  const [contests, setContests] = useState([
    { id: "1", name: "Summer Hit 2023", entries: 32, ends: "2023-05-15" },
    { id: "2", name: "Best Rock Song", entries: 18, ends: "2023-05-20" },
    { id: "3", name: "Electronic Challenge", entries: 24, ends: "2023-05-25" },
  ]);

  // Mock data for payment plans
  const [plans, setPlans] = useState([
    { id: "1", name: "Basic", price: "$4.99", credits: 50, features: ["50 credits/month", "Voice cloning (2 voices)", "Standard support"] },
    { id: "2", name: "Premium", price: "$9.99", credits: 120, features: ["120 credits/month", "Voice cloning (5 voices)", "Priority support", "Contest entry"] },
    { id: "3", name: "Pro", price: "$19.99", credits: 300, features: ["300 credits/month", "Unlimited voice cloning", "24/7 support", "Contest entry", "Commercial usage"] },
  ]);

  // Mock data for payment history
  const [payments, setPayments] = useState([
    { id: "1", user: "john@example.com", plan: "Premium", amount: "$9.99", date: "2023-04-15" },
    { id: "2", user: "sarah@example.com", plan: "Basic", amount: "$4.99", date: "2023-04-14" },
    { id: "3", user: "mike@example.com", plan: "Pro", amount: "$19.99", date: "2023-04-12" },
    { id: "4", user: "emma@example.com", plan: "Premium", amount: "$9.99", date: "2023-04-10" },
    { id: "5", user: "david@example.com", plan: "Basic", amount: "$4.99", date: "2023-04-08" },
  ]);

  // Mock data for support tickets
  const [tickets, setTickets] = useState([
    { id: "T-1234", user: "john@example.com", subject: "Payment issue", status: "Open", date: "Apr 15" },
    { id: "T-1233", user: "sarah@example.com", subject: "Can't generate song", status: "Open", date: "Apr 14" },
    { id: "T-1232", user: "mike@example.com", subject: "Voice clone failed", status: "Open", date: "Apr 14" },
    { id: "T-1231", user: "emma@example.com", subject: "Credits not added", status: "Open", date: "Apr 13" },
    { id: "T-1230", user: "david@example.com", subject: "Login problem", status: "In Progress", date: "Apr 12" },
  ]);

  // Set active tab based on prop or URL
  useEffect(() => {
    if (tab) {
      setActiveTab(tab);
    } else {
      // Extract tab from URL if not provided as prop
      const pathname = location.pathname;
      const urlTab = pathname.split('/').pop();
      if (urlTab && urlTab !== 'admin') {
        setActiveTab(urlTab);
      }
    }
  }, [tab, location.pathname]);

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    navigate(`/admin/${value === 'dashboard' ? '' : value}`);
  };

  // Redirect non-admin users
  if (!isAdmin()) {
    return <Navigate to="/dashboard" />;
  }

  // Handler functions
  const handleSaveApiKeys = () => {
    toast({
      title: "API Keys Saved",
      description: "Your API keys have been saved successfully.",
    });
  };

  const handleAssignAdmin = () => {
    const emails = adminEmails.split("\n").filter(email => email.trim() !== "");
    
    if (emails.length > 0) {
      // Add new admins to the list
      const newAdmins = emails.map((email, index) => ({
        id: `new-${index}`,
        name: email.split('@')[0],
        email: email,
        role: "Admin"
      }));
      
      setAdmins([...admins, ...newAdmins]);
      
      toast({
        title: "Admin Access Granted",
        description: `Admin access granted to ${emails.length} user(s).`,
      });
      setAdminEmails("");
    } else {
      toast({
        title: "No Emails Provided",
        description: "Please enter at least one email address.",
        variant: "destructive",
      });
    }
  };

  const handleRemoveAdmin = (id: string) => {
    setAdmins(admins.filter(admin => admin.id !== id));
    toast({
      title: "Admin Removed",
      description: "The admin has been removed successfully.",
    });
  };

  const handleSaveContestSettings = () => {
    toast({
      title: "Contest Settings Saved",
      description: "Your contest settings have been saved successfully.",
    });
  };

  const handleEditUser = (id: string) => {
    setEditingUser(id);
  };

  const handleSaveUser = (id: string) => {
    setEditingUser(null);
    toast({
      title: "User Updated",
      description: "User information has been updated successfully.",
    });
  };

  const handleSuspendUser = (id: string) => {
    setUsers(users.map(user => 
      user.id === id ? {...user, status: user.status === "Active" ? "Suspended" : "Active"} : user
    ));
    
    toast({
      title: "User Status Updated",
      description: `User has been ${users.find(u => u.id === id)?.status === "Active" ? "suspended" : "activated"}.`,
    });
  };

  const handleRemoveContent = (id: string) => {
    setContent(content.filter(item => item.id !== id));
    toast({
      title: "Content Removed",
      description: "The content has been removed successfully.",
    });
  };

  const handleCreateContest = () => {
    const newContest = {
      id: `${contests.length + 1}`,
      name: "New Contest",
      entries: 0,
      ends: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    };
    
    setContests([...contests, newContest]);
    
    toast({
      title: "Contest Created",
      description: "New contest has been created successfully.",
    });
  };

  const handleAddPlan = () => {
    const newPlan = {
      id: `${plans.length + 1}`,
      name: "New Plan",
      price: "$0.00",
      credits: 0,
      features: ["Basic features"]
    };
    
    setPlans([...plans, newPlan]);
    setSelectedPlan(`${plans.length + 1}`);
    
    toast({
      title: "Plan Added",
      description: "New plan has been added. Please edit the details.",
    });
  };

  const handleEditPlan = (id: string) => {
    setSelectedPlan(id);
  };

  const handleRemovePlan = (id: string) => {
    setPlans(plans.filter(plan => plan.id !== id));
    
    toast({
      title: "Plan Removed",
      description: "The plan has been removed successfully.",
    });
  };

  const handleRespondToTicket = (id: string) => {
    // In a real app, this would open a response modal or page
    toast({
      title: "Responding to Ticket",
      description: `Opening response form for ticket ${id}.`,
    });
  };

  const handleFilterTickets = (filter: string) => {
    setTicketFilter(filter);
  };

  const handleGenerateReport = (reportName: string) => {
    toast({
      title: "Generating Report",
      description: `${reportName} is being generated. It will be available shortly.`,
    });
  };

  const handleSaveSettings = () => {
    toast({
      title: "Settings Saved",
      description: "Your settings have been saved successfully.",
    });
  };

  const handleToggleSetting = (setting: string) => {
    toast({
      title: "Setting Updated",
      description: `${setting} has been updated.`,
    });
  };

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredContent = content.filter(item => 
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    item.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.user.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTickets = tickets.filter(ticket => 
    ticketFilter === "all" || ticket.status.toLowerCase() === ticketFilter.toLowerCase()
  );

  // Fix for the Element to string TypeScript errors
  const getCheckboxIcon = (checked: boolean): ReactNode => {
    return checked ? 
      <Check className="h-4 w-4 mr-2" /> : 
      null;
  };

  const renderPlanFeatures = (features: string[]): ReactNode => {
    return features.map((feature, featIndex) => (
      <li key={featIndex} className="flex items-center">
        <span className="text-green-500 mr-2">✓</span> {feature}
      </li>
    ));
  };

  const renderCheckbox = (checked: boolean): ReactNode => {
    if (checked) {
      return <Check className="h-4 w-4 mr-2" />;
    }
    return null;
  };

  const getButtonContent = (checked: boolean, text: string): ReactNode => (
    <>
      {checked ? <Check className="h-4 w-4 mr-2" /> : null}
      {text}
    </>
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Admin Control Panel</h1>
        <Button variant="outline" onClick={() => navigate('/admin/settings')}>
          <Settings className="h-4 w-4 mr-2" />
          Admin Settings
        </Button>
      </div>

      <Tabs defaultValue={activeTab} value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid grid-cols-5 lg:grid-cols-10 w-full mb-6">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="admins">Admins</TabsTrigger>
          <TabsTrigger value="apis">API Keys</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="contest">Contest</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="support">Support</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        
        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Admin Dashboard</CardTitle>
              <CardDescription>Overview of system metrics and activity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <UsersIcon className="h-8 w-8 mx-auto text-melody-secondary mb-2" />
                      <div className="text-2xl font-bold">234</div>
                      <p className="text-sm text-muted-foreground">Total Users</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <Music className="h-8 w-8 mx-auto text-melody-primary mb-2" />
                      <div className="text-2xl font-bold">562</div>
                      <p className="text-sm text-muted-foreground">Songs Generated</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <Trophy className="h-8 w-8 mx-auto text-amber-500 mb-2" />
                      <div className="text-2xl font-bold">8</div>
                      <p className="text-sm text-muted-foreground">Active Contests</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <Star className="h-8 w-8 mx-auto text-green-500 fill-green-500 mb-2" />
                      <div className="text-2xl font-bold">$4,320</div>
                      <p className="text-sm text-muted-foreground">Monthly Revenue</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="mt-6">
                <h3 className="text-lg font-medium mb-4">Recent Activity</h3>
                <div className="space-y-4">
                  {[
                    { user: "john@example.com", action: "Created a new song", time: "5 minutes ago" },
                    { user: "sarah@example.com", action: "Joined contest #8", time: "1 hour ago" },
                    { user: "mike@example.com", action: "Purchased premium plan", time: "3 hours ago" },
                    { user: "emma@example.com", action: "Created voice clone", time: "5 hours ago" },
                  ].map((activity, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-muted/50 rounded-md">
                      <div>
                        <p className="font-medium">{activity.user}</p>
                        <p className="text-sm text-muted-foreground">{activity.action}</p>
                      </div>
                      <div className="text-sm text-muted-foreground">{activity.time}</div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Users Tab */}
        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Manage users and their permissions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between mb-4">
                <Input 
                  className="max-w-sm" 
                  placeholder="Search users..." 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)}
                  prefix={<Search className="h-4 w-4 text-muted-foreground" />}
                />
                <div className="space-x-2">
                  <Button variant="outline" onClick={() => toast({ title: "Users Exported", description: "User data has been exported successfully." })}>Export</Button>
                  <Button onClick={() => toast({ title: "Add User", description: "User creation form will open." })}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add User
                  </Button>
                </div>
              </div>
              
              <div className="border rounded-md">
                <div className="grid grid-cols-5 font-medium p-4 border-b">
                  <div>User</div>
                  <div>Credits</div>
                  <div>Plan</div>
                  <div>Status</div>
                  <div>Actions</div>
                </div>
                
                {filteredUsers.map((user, index) => (
                  <div key={index} className="grid grid-cols-5 p-4 border-b items-center">
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                    <div>
                      {editingUser === user.id ? (
                        <Input
                          type="number"
                          value={user.credits}
                          className="w-24"
                          onChange={(e) => {
                            const updatedUsers = [...users];
                            updatedUsers[index].credits = parseInt(e.target.value);
                            setUsers(updatedUsers);
                          }}
                        />
                      ) : (
                        user.credits
                      )}
                    </div>
                    <div>
                      {editingUser === user.id ? (
                        <select
                          className="border rounded-md p-1 w-32"
                          value={user.plan}
                          onChange={(e) => {
                            const updatedUsers = [...users];
                            updatedUsers[index].plan = e.target.value;
                            setUsers(updatedUsers);
                          }}
                        >
                          <option value="Free">Free</option>
                          <option value="Basic">Basic</option>
                          <option value="Premium">Premium</option>
                        </select>
                      ) : (
                        user.plan
                      )}
                    </div>
                    <div>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        user.status === "Active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                      }`}>
                        {user.status}
                      </span>
                    </div>
                    <div className="space-x-2">
                      {editingUser === user.id ? (
                        <>
                          <Button size="sm" variant="outline" onClick={() => handleSaveUser(user.id)}>
                            <Check className="h-4 w-4 mr-1" />
                            Save
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingUser(null)}>
                            <X className="h-4 w-4 mr-1" />
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button size="sm" variant="outline" onClick={() => handleEditUser(user.id)}>
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className={user.status === "Active" ? "text-red-500" : "text-green-500"}
                            onClick={() => handleSuspendUser(user.id)}
                          >
                            {user.status === "Active" ? (
                              <>
                                <X className="h-4 w-4 mr-1" />
                                Suspend
                              </>
                            ) : (
                              <>
                                <Check className="h-4 w-4 mr-1" />
                                Activate
                              </>
                            )}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex justify-between mt-4">
                <div>Showing {filteredUsers.length} of {users.length} users</div>
                <div className="flex space-x-1">
                  <Button size="sm" variant="outline">Previous</Button>
                  <Button size="sm" variant="outline">Next</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Admins Tab */}
        <TabsContent value="admins" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Admin Management</CardTitle>
              <CardDescription>Grant admin access to users</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-medium mb-4">Assign Admin Role</h3>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="admin-emails">Email Addresses (one per line)</Label>
                      <Textarea 
                        id="admin-emails" 
                        placeholder="user1@example.com&#10;user2@example.com" 
                        className="h-32"
                        value={adminEmails}
                        onChange={(e) => setAdminEmails(e.target.value)}
                      />
                    </div>
                    <Button onClick={handleAssignAdmin} className="bg-melody-secondary hover:bg-melody-secondary/90">
                      <Shield className="h-4 w-4 mr-2" />
                      Grant Admin Access
                    </Button>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-4">Current Admins</h3>
                  <div className="space-y-2">
                    {admins.map((admin, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-muted/50 rounded-md">
                        <div>
                          <p className="font-medium">{admin.name}</p>
                          <p className="text-sm text-muted-foreground">{admin.email}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{admin.role}</span>
                          {admin.role !== "Super Admin" && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="h-8 text-red-500"
                              onClick={() => handleRemoveAdmin(admin.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Remove
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Keys Tab */}
        <TabsContent value="apis" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>API Keys Management</CardTitle>
              <CardDescription>Configure integration API keys</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">Music Generation APIs</h3>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="suno-api-key">Suno API Key</Label>
                      <div className="flex gap-2">
                        <Input 
                          id="suno-api-key" 
                          type="password" 
                          placeholder="Enter Suno API key" 
                          className="flex-1"
                          value={sunoApiKey}
                          onChange={(e) => setSunoApiKey(e.target.value)}
                        />
                        <Button 
                          variant="outline"
                          onClick={() => {
                            toast({
                              title: "API Key Tested",
                              description: sunoApiKey ? "Suno API key is valid." : "Please enter an API key.",
                              variant: sunoApiKey ? "default" : "destructive",
                            });
                          }}
                        >
                          Test
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Used for AI music generation</p>
                    </div>
                    
                    <div>
                      <Label htmlFor="eleven-labs-api-key">ElevenLabs API Key</Label>
                      <div className="flex gap-2">
                        <Input 
                          id="eleven-labs-api-key" 
                          type="password" 
                          placeholder="Enter ElevenLabs API key" 
                          className="flex-1"
                          value={elevenLabsApiKey}
                          onChange={(e) => setElevenLabsApiKey(e.target.value)}
                        />
                        <Button 
                          variant="outline"
                          onClick={() => {
                            toast({
                              title: "API Key Tested",
                              description: elevenLabsApiKey ? "ElevenLabs API key is valid." : "Please enter an API key.",
                              variant: elevenLabsApiKey ? "default" : "destructive",
                            });
                          }}
                        >
                          Test
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Used for voice cloning and text-to-speech</p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-4">Payment APIs</h3>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="stripe-api-key">Stripe API Key</Label>
                      <div className="flex gap-2">
                        <Input 
                          id="stripe-api-key" 
                          type="password" 
                          placeholder="Enter Stripe API key" 
                          className="flex-1"
                        />
                        <Button 
                          variant="outline"
                          onClick={() => {
                            toast({
                              title: "API Key Tested",
                              description: "Please enter an API key.",
                              variant: "destructive",
                            });
                          }}
                        >
                          Test
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Used for payment processing</p>
                    </div>
                  </div>
                </div>
                
                <Button onClick={handleSaveApiKeys} className="bg-melody-secondary hover:bg-melody-secondary/90">
                  <Key className="h-4 w-4 mr-2" />
                  Save API Keys
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Content Tab */}
        <TabsContent value="content" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Content Management</CardTitle>
              <CardDescription>Manage songs, instrumentals and user content</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex justify-between mb-4">
                  <Input 
                    className="max-w-sm" 
                    placeholder="Search content..." 
                    value={searchQuery} 
                    onChange={(e) => setSearchQuery(e.target.value)}
                    prefix={<Search className="h-4 w-4 text-muted-foreground" />}
                  />
                  <div className="space-x-2">
                    <Button 
                      variant="outline"
                      onClick={() => toast({ title: "Filters Applied", description: "Content has been filtered." })}
                    >
                      Filter
                    </Button>
                    <Button 
                      onClick={() => toast({ title: "Upload Content", description: "Content upload form will open." })}
                    >
                      Upload Content
                    </Button>
                  </div>
                </div>
                
                <div className="border rounded-md">
                  <div className="grid grid-cols-5 font-medium p-4 border-b">
                    <div>Title</div>
                    <div>Type</div>
                    <div>User</div>
                    <div>Created</div>
                    <div>Actions</div>
                  </div>
                  
                  {filteredContent.map((item, index) => (
                    <div key={index} className="grid grid-cols-5 p-4 border-b items-center">
                      <div className="font-medium">{item.title}</div>
                      <div>{item.type}</div>
                      <div className="text-sm">{item.user}</div>
                      <div className="text-sm">{item.created}</div>
                      <div className="space-x-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => toast({ title: "Content Viewed", description: `Viewing ${item.title}.` })}
                        >
                          View
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-red-500"
                          onClick={() => handleRemoveContent(item.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="flex justify-between mt-4">
                  <div>Showing {filteredContent.length} of {content.length} items</div>
                  <div className="flex space-x-1">
                    <Button size="sm" variant="outline">Previous</Button>
                    <Button size="sm" variant="outline">Next</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contest Tab */}
        <TabsContent value="contest" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contest Management</CardTitle>
              <CardDescription>Manage music contests and submissions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-medium mb-4">Contest Settings</h3>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="contest-points">Points Required for Entry</Label>
                      <Input 
                        id="contest-points" 
                        type="number" 
                        value={contestPoints}
                        onChange={(e) => setContestPoints(e.target.value)}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="contest-rules">Contest Rules</Label>
                      <Textarea 
                        id="contest-rules" 
                        className="h-32"
                        value={contestRules}
                        onChange={(e) => setContestRules(e.target.value)}
                      />
                    </div>
                    
                    <Button onClick={handleSaveContestSettings} className="bg-melody-secondary hover:bg-melody-secondary/90">
                      <Trophy className="h-4 w-4 mr-2" />
                      Save Contest Settings
                    </Button>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-4">Active Contests</h3>
                  <div className="space-y-3">
                    {contests.map((contest, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-muted/50 rounded-md">
                        <div>
                          <p className="font-medium">{contest.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {contest.entries} entries • Ends: {contest.ends}
                          </p>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => toast({ title: "Manage Contest", description: `Managing ${contest.name}.` })}
                        >
                          Manage
                        </Button>
                      </div>
                    ))}
                    <Button className="w-full mt-2" onClick={handleCreateContest}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create New Contest
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Payment Management</CardTitle>
              <CardDescription>Manage subscription plans and payment settings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <div className="flex justify-between mb-4">
                    <h3 className="text-lg font-medium">Subscription Plans</h3>
                    <Button size="sm" onClick={handleAddPlan}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Plan
                    </Button>
                  </div>
                  <div className="space-y-4">
                    {plans.map((plan, index) => (
                      <div key={index} className="border rounded-md p-4">
                        {selectedPlan === plan.id ? (
                          <>
                            <div className="flex justify-between items-center mb-2">
                              <Input 
                                className="font-bold text-lg w-40" 
                                value={plan.name}
                                onChange={(e) => {
                                  const updatedPlans = [...plans];
                                  updatedPlans[index].name = e.target.value;
                                  setPlans(updatedPlans);
                                }}
                              />
                              <div className="flex items-center">
                                <span className="mr-1">$</span>
                                <Input 
                                  type="number" 
                                  className="w-20"
                                  value={plan.price.replace('$', '')}
                                  onChange={(e) => {
                                    const updatedPlans = [...plans];
                                    updatedPlans[index].price = `$${e.target.value}`;
                                    setPlans(updatedPlans);
                                  }}
                                />
                                <span className="ml-1">/month</span>
                              </div>
                            </div>
                            <div className="flex items-center mb-2">
                              <Input 
                                type="number" 
                                className="w-20 mr-2"
                                value={plan.credits}
                                onChange={(e) => {
                                  const updatedPlans = [...plans];
                                  updatedPlans[index].credits = parseInt(e.target.value);
                                  setPlans(updatedPlans);
                                }}
                              />
                              <span className="text-sm text-muted-foreground">credits per month</span>
                            </div>
                            <div className="space-y-2 mb-4">
                              {plan.features.map((feature, featIndex) => (
                                <div key={featIndex} className="flex items-center">
                                  <span className="text-green-500 mr-2">✓</span>
                                  <Input 
                                    value={feature} 
                                    className="text-sm"
                                    onChange={(e) => {
                                      const updatedPlans = [...plans];
                                      updatedPlans[index].features[featIndex] = e.target.value;
                                      setPlans(updatedPlans);
                                    }}
                                  />
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="text-red-500 h-8 w-8 p-0 ml-1"
                                    onClick={() => {
                                      const updatedPlans = [...plans];
                                      updatedPlans[index].features = updatedPlans[index].features.filter((_, i) => i !== featIndex);
                                      setPlans(updatedPlans);
                                    }}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="w-full mt-2"
                                onClick={() => {
                                  const updatedPlans = [...plans];
                                  updatedPlans[index].features.push("New feature");
                                  setPlans(updatedPlans);
                                }}
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Feature
                              </Button>
                            </div>
                            <div className="flex gap-2 mt-4">
                              <Button 
                                size="sm" 
                                onClick={() => {
                                  setSelectedPlan(null);
                                  toast({
                                    title: "Plan Updated",
                                    description: "Plan has been updated successfully.",
                                  });
                                }}
                              >
                                {getButtonContent(true, "Save")}
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => setSelectedPlan(null)}
                              >
                                <X className="h-4 w-4 mr-2" />
                                Cancel
                              </Button>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex justify-between items-center mb-2">
                              <h4 className="font-bold text-lg">{plan.name}</h4>
                              <p className="font-bold">{plan.price}/month</p>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">{plan.credits} credits per month</p>
                            <ul className="text-sm space-y-1">
                              {renderPlanFeatures(plan.features)}
                            </ul>
                            <div className="mt-4 flex gap-2">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => handleEditPlan(plan.id)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </Button>
                              {index > 0 && (
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="text-red-500"
                                  onClick={() => handleRemovePlan(plan.id)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Remove
                                </Button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-4">Payment History</h3>
                  <div className="border rounded-md">
                    <div className="grid grid-cols-4 font-medium p-3 border-b">
                      <div>User</div>
                      <div>Plan</div>
                      <div>Amount</div>
                      <div>Date</div>
                    </div>
                    
                    {payments.map((payment, index) => (
                      <div key={index} className="grid grid-cols-4 p-3 border-b text-sm">
                        <div>{payment.user}</div>
                        <div>{payment.plan}</div>
                        <div>{payment.amount}</div>
                        <div>{payment.date}</div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex justify-between mt-4">
                    <div className="text-sm">Showing {payments.length} of 120 transactions</div>
                    <div className="flex space-x-1">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => toast({ title: "Navigation", description: "Previous page." })}
                      >
                        Previous
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => toast({ title: "Navigation", description: "Next page." })}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Support Tab */}
        <TabsContent value="support" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Customer Support</CardTitle>
              <CardDescription>Manage support tickets and user inquiries</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between mb-4">
                <div className="space-x-2">
                  <Button 
                    variant={ticketFilter === "open" ? "outline" : "ghost"} 
                    className={ticketFilter === "open" ? "bg-green-50" : ""}
                    onClick={() => handleFilterTickets("open")}
                  >
                    Open (8)
                  </Button>
                  <Button 
                    variant={ticketFilter === "in progress" ? "outline" : "ghost"} 
                    className={ticketFilter === "in progress" ? "bg-blue-50" : ""}
                    onClick={() => handleFilterTickets("in progress")}
                  >
                    In Progress (5)
                  </Button>
                  <Button 
                    variant={ticketFilter === "resolved" ? "outline" : "ghost"} 
                    className={ticketFilter === "resolved" ? "bg-gray-50" : ""}
                    onClick={() => handleFilterTickets("resolved")}
                  >
                    Resolved (23)
                  </Button>
                  <Button 
                    variant={ticketFilter === "all" ? "outline" : "ghost"} 
                    onClick={() => handleFilterTickets("all")}
                  >
                    All
                  </Button>
                </div>
                <Button 
                  variant="outline"
                  onClick={() => toast({ title: "Tickets Exported", description: "Support tickets have been exported." })}
                >
                  Export
                </Button>
              </div>
              
              <div className="border rounded-md">
                <div className="grid grid-cols-5 font-medium p-4 border-b">
                  <div>Ticket</div>
                  <div>User</div>
                  <div>Subject</div>
                  <div>Status</div>
                  <div>Actions</div>
                </div>
                
                {filteredTickets.map((ticket, index) => (
                  <div key={index} className="grid grid-cols-5 p-4 border-b items-center">
                    <div className="font-medium">{ticket.id}</div>
                    <div className="text-sm">{ticket.user}</div>
                    <div>{ticket.subject}</div>
                    <div>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        ticket.status === "Open" ? "bg-green-100 text-green-800" : 
                        ticket.status === "In Progress" ? "bg-blue-100 text-blue-800" : 
                        "bg-gray-100 text-gray-800"
                      }`}>
                        {ticket.status}
                      </span>
                    </div>
                    <div className="space-x-2">
                      <Button 
                        size="sm"
                        onClick={() => handleRespondToTicket(ticket.id)}
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Respond
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex justify-between mt-4">
                <div>Showing {filteredTickets.length} of 36 tickets</div>
                <div className="flex space-x-1">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => toast({ title: "Navigation", description: "Previous page." })}
                  >
                    Previous
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => toast({ title: "Navigation", description: "Next page." })}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Reports & Analytics</CardTitle>
              <CardDescription>View system analytics and generate reports</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">Usage Analytics</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <Music className="h-8 w-8 mx-auto text-melody-secondary mb-2" />
                          <div className="text-2xl font-bold">1,250</div>
                          <p className="text-sm text-muted-foreground">Songs Generated</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <Star className="h-8 w-8 mx-auto text-melody-primary mb-2 fill-melody-primary" />
                          <div className="text-2xl font-bold">8,500</div>
                          <p className="text-sm text-muted-foreground">Credits Used</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <Database className="h-8 w-8 mx-auto text-melody-accent mb-2" />
                          <div className="text-2xl font-bold">42 GB</div>
                          <p className="text-sm text-muted-foreground">Storage Used</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-4">Generate Reports</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { name: "User Activity Report", description: "User sign-ups, logins, and content creation" },
                      { name: "Revenue Report", description: "Subscription revenue, one-time purchases and credits" },
                      { name: "Content Generation Report", description: "Songs, voice clones and instrumental tracks created" },
                      { name: "Resource Usage Report", description: "API calls, storage usage, and processing time" },
                    ].map((report, index) => (
                      <div key={index} className="flex justify-between items-center p-4 border rounded-md">
                        <div>
                          <p className="font-medium">{report.name}</p>
                          <p className="text-sm text-muted-foreground">{report.description}</p>
                        </div>
                        <div className="space-x-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleGenerateReport(report.name)}
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Generate
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>System Settings</CardTitle>
              <CardDescription>Configure global application settings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-medium mb-4">General Settings</h3>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="app-name">Application Name</Label>
                      <Input id="app-name" defaultValue="MelodyVerse" />
                    </div>
                    <div>
                      <Label htmlFor="support-email">Support Email</Label>
                      <Input id="support-email" defaultValue="support@melodyverse.com" />
                    </div>
                    <div>
                      <Label htmlFor="default-credits">Default Credits for New Users</Label>
                      <Input id="default-credits" type="number" defaultValue="5" />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="maintenance-mode">Maintenance Mode</Label>
                        <p className="text-sm text-muted-foreground">Temporarily disable access for non-admin users</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Label htmlFor="maintenance-mode" className="sr-only">
                          Maintenance Mode
                        </Label>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleToggleSetting("Maintenance Mode")}
                        >
                          Enable
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-4">Notification Settings</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="user-signup-notify">New User Registrations</Label>
                        <p className="text-sm text-muted-foreground">Send notifications when new users register</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Label htmlFor="user-signup-notify" className="sr-only">
                          New User Registrations
                        </Label>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleToggleSetting("New User Registration Notifications")}
                        >
                          Disable
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="payment-notify">Payment Notifications</Label>
                        <p className="text-sm text-muted-foreground">Send notifications for subscription events</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Label htmlFor="payment-notify" className="sr-only">
                          Payment Notifications
                        </Label>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleToggleSetting("Payment Notifications")}
                        >
                          Enable
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="contest-notify">Contest Updates</Label>
                        <p className="text-sm text-muted-foreground">Send notifications for contest events</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Label htmlFor="contest-notify" className="sr-only">
                          Contest Updates
                        </Label>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleToggleSetting("Contest Update Notifications")}
                        >
                          Enable
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <Button 
                className="mt-6 bg-melody-secondary hover:bg-melody-secondary/90"
                onClick={handleSaveSettings}
              >
                <Settings className="h-4 w-4 mr-2" />
                Save Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;
