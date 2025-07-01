
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserManagement } from "./UserManagement";
import { ContentManagement } from "./ContentManagement";
import { PaymentManagement } from "./PaymentManagement";
import { ReportsAnalytics } from "./ReportsAnalytics";
import { SupportManagement } from "./SupportManagement";
import { SettingsManagement } from "./SettingsManagement";
import { ContestManagement } from "./ContestManagement";
import { GenreManagement } from "./GenreManagement";

interface AdminManagementProps {
  users?: any[];
  admins?: any[];
  apiKeys?: any[];
  renderStatusLabel?: (status: string) => React.ReactNode;
}

export const AdminManagement = ({ 
  users = [], 
  admins = [],
  apiKeys = [],
  renderStatusLabel = (status: string) => status
}: AdminManagementProps) => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Panel</h1>
        <p className="text-muted-foreground">Manage your application settings and data</p>
      </div>
      
      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-8">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="genres">Genres</TabsTrigger>
          <TabsTrigger value="contests">Contests</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="support">Support</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="users">
          <UserManagement users={users} renderStatusLabel={renderStatusLabel} />
        </TabsContent>
        
        <TabsContent value="content">
          <ContentManagement />
        </TabsContent>
        
        <TabsContent value="genres">
          <GenreManagement />
        </TabsContent>
        
        <TabsContent value="contests">
          <ContestManagement />
        </TabsContent>
        
        <TabsContent value="payments">
          <PaymentManagement />
        </TabsContent>
        
        <TabsContent value="reports">
          <ReportsAnalytics />
        </TabsContent>
        
        <TabsContent value="support">
          <SupportManagement />
        </TabsContent>
        
        <TabsContent value="settings">
          <SettingsManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminManagement;
