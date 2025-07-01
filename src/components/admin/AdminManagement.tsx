
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserManagement } from "./UserManagement";

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
        <h1 className="text-3xl font-bold">Admin Management</h1>
        <p className="text-muted-foreground">Manage administrator accounts and permissions</p>
      </div>
      
      <Tabs defaultValue="admin-users" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="admin-users">Admin Users</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="access">Access Control</TabsTrigger>
        </TabsList>
        
        <TabsContent value="admin-users">
          <UserManagement 
            users={admins} 
            renderStatusLabel={renderStatusLabel}
          />
        </TabsContent>
        
        <TabsContent value="permissions">
          <div className="text-center py-8">
            <h3 className="text-lg font-semibold mb-2">Admin Permissions</h3>
            <p className="text-muted-foreground">Configure admin permissions and access levels</p>
          </div>
        </TabsContent>
        
        <TabsContent value="roles">
          <div className="text-center py-8">
            <h3 className="text-lg font-semibold mb-2">Admin Roles</h3>
            <p className="text-muted-foreground">Manage admin role assignments</p>
          </div>
        </TabsContent>
        
        <TabsContent value="access">
          <div className="text-center py-8">
            <h3 className="text-lg font-semibold mb-2">Access Control</h3>
            <p className="text-muted-foreground">Configure access control settings</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminManagement;
