
import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserManagement } from "./UserManagement";
import { fetchUsersFromDatabase } from '@/utils/adminOperations';
import { toast } from 'sonner';

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
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadAdminUsers();
  }, []);

  const loadAdminUsers = async () => {
    setIsLoading(true);
    try {
      console.log("AdminManagement: Loading all users to filter admins...");
      const allUsers = await fetchUsersFromDatabase();
      console.log("AdminManagement: All users loaded:", allUsers);
      
      // Filter only admin and super_admin users
      const filteredAdminUsers = allUsers.filter(user => 
        user.role === 'admin' || user.role === 'super_admin'
      );
      
      console.log("AdminManagement: Filtered admin users:", filteredAdminUsers);
      setAdminUsers(filteredAdminUsers);
      
      if (filteredAdminUsers.length === 0) {
        toast.info("No admin users found");
      } else {
        toast.success(`Loaded ${filteredAdminUsers.length} admin users`);
      }
    } catch (error: any) {
      console.error("AdminManagement: Failed to load admin users:", error);
      toast.error("Failed to load admin users", { description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

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
            users={adminUsers} 
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
