
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { UsersIcon, StarIcon, Settings2Icon, AlertTriangleIcon } from "lucide-react";

const Admin = () => {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState("users");

  // Redirect non-admin users
  if (!isAdmin()) {
    return <Navigate to="/dashboard" />;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <Button variant="outline">
          <Settings2Icon className="h-4 w-4 mr-2" />
          Settings
        </Button>
      </div>

      <Tabs defaultValue="users" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full max-w-md mb-6">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="credits">Credits</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>
        
        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Manage users and their permissions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                      <UsersIcon className="h-8 w-8 mx-auto text-melody-primary mb-2" />
                      <div className="text-2xl font-bold">18</div>
                      <p className="text-sm text-muted-foreground">New Users (Last 7 days)</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <UsersIcon className="h-8 w-8 mx-auto text-melody-accent mb-2" />
                      <div className="text-2xl font-bold">3</div>
                      <p className="text-sm text-muted-foreground">Admins</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="mt-6">
                <Button className="bg-melody-secondary hover:bg-melody-secondary/90">
                  Manage Users
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="credits" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Credit Management</CardTitle>
              <CardDescription>Manage credit allocations and transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <StarIcon className="h-8 w-8 mx-auto text-melody-secondary fill-melody-secondary mb-2" />
                      <div className="text-2xl font-bold">1,250</div>
                      <p className="text-sm text-muted-foreground">Total Credits Issued</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <StarIcon className="h-8 w-8 mx-auto text-melody-primary mb-2" />
                      <div className="text-2xl font-bold">850</div>
                      <p className="text-sm text-muted-foreground">Credits Used</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <StarIcon className="h-8 w-8 mx-auto text-melody-accent mb-2" />
                      <div className="text-2xl font-bold">400</div>
                      <p className="text-sm text-muted-foreground">Credits Available</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="mt-6">
                <Button className="bg-melody-secondary hover:bg-melody-secondary/90">
                  Credit Transactions
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="content" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Content Management</CardTitle>
              <CardDescription>Manage songs, instrumentals and voice clones</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="h-8 w-8 mx-auto text-melody-secondary mb-2">🎵</div>
                      <div className="text-2xl font-bold">56</div>
                      <p className="text-sm text-muted-foreground">Total Songs</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="h-8 w-8 mx-auto text-melody-primary mb-2">🎙️</div>
                      <div className="text-2xl font-bold">23</div>
                      <p className="text-sm text-muted-foreground">Voice Clones</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="h-8 w-8 mx-auto text-melody-accent mb-2">🎹</div>
                      <div className="text-2xl font-bold">34</div>
                      <p className="text-sm text-muted-foreground">Instrumentals</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="mt-6">
                <Button className="bg-melody-secondary hover:bg-melody-secondary/90">
                  Review Content
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Reports & Flags</CardTitle>
              <CardDescription>Review reported content and issues</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <AlertTriangleIcon className="h-8 w-8 mx-auto text-red-500 mb-2" />
                      <div className="text-2xl font-bold">5</div>
                      <p className="text-sm text-muted-foreground">Open Reports</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <AlertTriangleIcon className="h-8 w-8 mx-auto text-amber-500 mb-2" />
                      <div className="text-2xl font-bold">3</div>
                      <p className="text-sm text-muted-foreground">In Review</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <AlertTriangleIcon className="h-8 w-8 mx-auto text-green-500 mb-2" />
                      <div className="text-2xl font-bold">12</div>
                      <p className="text-sm text-muted-foreground">Resolved Reports</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="mt-6">
                <Button className="bg-melody-secondary hover:bg-melody-secondary/90">
                  Handle Reports
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;
