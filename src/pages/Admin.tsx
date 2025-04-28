
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  Settings,
  Database,
  Shield,
  Music,
  Trophy,
  Star,
  Key,
  MessageSquare,
  Bell,
  FileText
} from "lucide-react";

const Admin = () => {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");
  const { toast } = useToast();
  const [sunoApiKey, setSunoApiKey] = useState("");
  const [elevenLabsApiKey, setElevenLabsApiKey] = useState("");
  const [adminEmails, setAdminEmails] = useState("");
  const [contestPoints, setContestPoints] = useState("100");
  const [contestRules, setContestRules] = useState("1. Submissions must be original\n2. Maximum song length: 3 minutes\n3. No explicit content");

  // Redirect non-admin users
  if (!isAdmin()) {
    return <Navigate to="/dashboard" />;
  }

  const handleSaveApiKeys = () => {
    toast({
      title: "API Keys Saved",
      description: "Your API keys have been saved successfully.",
    });
  };

  const handleAssignAdmin = () => {
    const emails = adminEmails.split("\n").filter(email => email.trim() !== "");
    
    if (emails.length > 0) {
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

  const handleSaveContestSettings = () => {
    toast({
      title: "Contest Settings Saved",
      description: "Your contest settings have been saved successfully.",
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Admin Control Panel</h1>
        <Button variant="outline">
          <Settings className="h-4 w-4 mr-2" />
          Admin Settings
        </Button>
      </div>

      <Tabs defaultValue="dashboard" value={activeTab} onValueChange={setActiveTab}>
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
                      <Users className="h-8 w-8 mx-auto text-melody-secondary mb-2" />
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
                <Input className="max-w-sm" placeholder="Search users..." />
                <div className="space-x-2">
                  <Button variant="outline">Export</Button>
                  <Button>Add User</Button>
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
                
                {[
                  { name: "John Doe", email: "john@example.com", credits: 25, plan: "Premium", status: "Active" },
                  { name: "Sarah Smith", email: "sarah@example.com", credits: 10, plan: "Basic", status: "Active" },
                  { name: "Michael Brown", email: "mike@example.com", credits: 50, plan: "Premium", status: "Active" },
                  { name: "Emma Wilson", email: "emma@example.com", credits: 0, plan: "Free", status: "Suspended" },
                  { name: "David Johnson", email: "david@example.com", credits: 15, plan: "Basic", status: "Active" },
                ].map((user, index) => (
                  <div key={index} className="grid grid-cols-5 p-4 border-b items-center">
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                    <div>{user.credits}</div>
                    <div>{user.plan}</div>
                    <div>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        user.status === "Active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                      }`}>
                        {user.status}
                      </span>
                    </div>
                    <div className="space-x-2">
                      <Button size="sm" variant="outline">Edit</Button>
                      <Button size="sm" variant="outline" className="text-red-500">Suspend</Button>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex justify-between mt-4">
                <div>Showing 5 of 234 users</div>
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
                    {[
                      { name: "Admin User", email: "admin@example.com", role: "Super Admin" },
                      { name: "Jane Doe", email: "jane@example.com", role: "Admin" },
                      { name: "Robert Smith", email: "robert@example.com", role: "Admin" },
                    ].map((admin, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-muted/50 rounded-md">
                        <div>
                          <p className="font-medium">{admin.name}</p>
                          <p className="text-sm text-muted-foreground">{admin.email}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{admin.role}</span>
                          {admin.role !== "Super Admin" && (
                            <Button size="sm" variant="outline" className="h-8 text-red-500">
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
                        <Button variant="outline">Test</Button>
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
                        <Button variant="outline">Test</Button>
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
                        <Input id="stripe-api-key" type="password" placeholder="Enter Stripe API key" className="flex-1" />
                        <Button variant="outline">Test</Button>
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
                  <Input className="max-w-sm" placeholder="Search content..." />
                  <div className="space-x-2">
                    <Button variant="outline">Filter</Button>
                    <Button>Upload Content</Button>
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
                  
                  {[
                    { title: "Summer Vibes", type: "Song", user: "john@example.com", created: "2023-04-15" },
                    { title: "Electronic Beat 03", type: "Instrumental", user: "admin@example.com", created: "2023-04-12" },
                    { title: "Sarah's Voice", type: "Voice Clone", user: "sarah@example.com", created: "2023-04-10" },
                    { title: "Rock Anthem", type: "Song", user: "mike@example.com", created: "2023-04-08" },
                    { title: "Lo-Fi Background", type: "Instrumental", user: "admin@example.com", created: "2023-04-05" },
                  ].map((content, index) => (
                    <div key={index} className="grid grid-cols-5 p-4 border-b items-center">
                      <div className="font-medium">{content.title}</div>
                      <div>{content.type}</div>
                      <div className="text-sm">{content.user}</div>
                      <div className="text-sm">{content.created}</div>
                      <div className="space-x-2">
                        <Button size="sm" variant="outline">View</Button>
                        <Button size="sm" variant="outline" className="text-red-500">Remove</Button>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="flex justify-between mt-4">
                  <div>Showing 5 of 124 items</div>
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
                    {[
                      { name: "Summer Hit 2023", entries: 32, ends: "2023-05-15" },
                      { name: "Best Rock Song", entries: 18, ends: "2023-05-20" },
                      { name: "Electronic Challenge", entries: 24, ends: "2023-05-25" },
                    ].map((contest, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-muted/50 rounded-md">
                        <div>
                          <p className="font-medium">{contest.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {contest.entries} entries • Ends: {contest.ends}
                          </p>
                        </div>
                        <Button size="sm" variant="outline">Manage</Button>
                      </div>
                    ))}
                    <Button className="w-full mt-2">
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
                  <h3 className="text-lg font-medium mb-4">Subscription Plans</h3>
                  <div className="space-y-4">
                    {[
                      { name: "Basic", price: "$4.99", credits: 50, features: ["50 credits/month", "Voice cloning (2 voices)", "Standard support"] },
                      { name: "Premium", price: "$9.99", credits: 120, features: ["120 credits/month", "Voice cloning (5 voices)", "Priority support", "Contest entry"] },
                      { name: "Pro", price: "$19.99", credits: 300, features: ["300 credits/month", "Unlimited voice cloning", "24/7 support", "Contest entry", "Commercial usage"] },
                    ].map((plan, index) => (
                      <div key={index} className="border rounded-md p-4">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="font-bold text-lg">{plan.name}</h4>
                          <p className="font-bold">{plan.price}/month</p>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{plan.credits} credits per month</p>
                        <ul className="text-sm space-y-1">
                          {plan.features.map((feature, idx) => (
                            <li key={idx} className="flex items-center">
                              <span className="text-green-500 mr-2">✓</span> {feature}
                            </li>
                          ))}
                        </ul>
                        <div className="mt-4 flex gap-2">
                          <Button size="sm" variant="outline">Edit</Button>
                          {index > 0 && (
                            <Button size="sm" variant="outline" className="text-red-500">Remove</Button>
                          )}
                        </div>
                      </div>
                    ))}
                    <Button>Add New Plan</Button>
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
                    
                    {[
                      { user: "john@example.com", plan: "Premium", amount: "$9.99", date: "2023-04-15" },
                      { user: "sarah@example.com", plan: "Basic", amount: "$4.99", date: "2023-04-14" },
                      { user: "mike@example.com", plan: "Pro", amount: "$19.99", date: "2023-04-12" },
                      { user: "emma@example.com", plan: "Premium", amount: "$9.99", date: "2023-04-10" },
                      { user: "david@example.com", plan: "Basic", amount: "$4.99", date: "2023-04-08" },
                    ].map((payment, index) => (
                      <div key={index} className="grid grid-cols-4 p-3 border-b text-sm">
                        <div>{payment.user}</div>
                        <div>{payment.plan}</div>
                        <div>{payment.amount}</div>
                        <div>{payment.date}</div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex justify-between mt-4">
                    <div className="text-sm">Showing 5 of 120 transactions</div>
                    <div className="flex space-x-1">
                      <Button size="sm" variant="outline">Previous</Button>
                      <Button size="sm" variant="outline">Next</Button>
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
                  <Button variant="outline" className="bg-green-50">Open (8)</Button>
                  <Button variant="ghost">In Progress (5)</Button>
                  <Button variant="ghost">Resolved (23)</Button>
                </div>
                <Button variant="outline">Export</Button>
              </div>
              
              <div className="border rounded-md">
                <div className="grid grid-cols-5 font-medium p-4 border-b">
                  <div>Ticket</div>
                  <div>User</div>
                  <div>Subject</div>
                  <div>Status</div>
                  <div>Actions</div>
                </div>
                
                {[
                  { id: "T-1234", user: "john@example.com", subject: "Payment issue", status: "Open", date: "Apr 15" },
                  { id: "T-1233", user: "sarah@example.com", subject: "Can't generate song", status: "Open", date: "Apr 14" },
                  { id: "T-1232", user: "mike@example.com", subject: "Voice clone failed", status: "Open", date: "Apr 14" },
                  { id: "T-1231", user: "emma@example.com", subject: "Credits not added", status: "Open", date: "Apr 13" },
                  { id: "T-1230", user: "david@example.com", subject: "Login problem", status: "In Progress", date: "Apr 12" },
                ].map((ticket, index) => (
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
                      <Button size="sm">Respond</Button>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex justify-between mt-4">
                <div>Showing 5 of 36 tickets</div>
                <div className="flex space-x-1">
                  <Button size="sm" variant="outline">Previous</Button>
                  <Button size="sm" variant="outline">Next</Button>
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
                          <Button size="sm" variant="outline">
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
                        <Button variant="outline" size="sm">Enable</Button>
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
                        <Button variant="outline" size="sm">Disable</Button>
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
                        <Button variant="outline" size="sm">Enable</Button>
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
                        <Button variant="outline" size="sm">Enable</Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <Button className="mt-6 bg-melody-secondary hover:bg-melody-secondary/90">Save Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;
