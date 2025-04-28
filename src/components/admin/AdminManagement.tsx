
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Admin {
  id: number;
  name: string;
  email: string;
  role: string;
  permissions: string;
  lastActive: string;
}

interface AdminManagementProps {
  admins: Admin[];
}

export const AdminManagement = ({ admins }: AdminManagementProps) => {
  const [adminsList, setAdminsList] = useState<Admin[]>(admins);

  const handleEdit = (adminId: number) => {
    toast.info(`Editing admin with ID: ${adminId}`);
    // In a real app, this would open an edit form or modal
  };

  const handleRemove = (adminId: number) => {
    toast.success(`Admin with ID: ${adminId} has been removed`);
    setAdminsList(adminsList.filter(admin => admin.id !== adminId));
  };

  const handleAddAdmin = () => {
    toast.info("Adding new admin - this would open a form in a real application");
    // In a real app, this would open a form to add a new admin
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Admin Management</h2>
        <Button onClick={handleAddAdmin}>Add New Admin</Button>
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
            {adminsList.map((admin) => (
              <tr key={admin.id} className="border-b">
                <td className="py-3 px-4">{admin.name}</td>
                <td className="py-3 px-4">{admin.email}</td>
                <td className="py-3 px-4">{admin.role}</td>
                <td className="py-3 px-4">{admin.permissions}</td>
                <td className="py-3 px-4">{admin.lastActive}</td>
                <td className="py-3 px-4 text-right">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 px-2"
                    onClick={() => handleEdit(admin.id)}
                  >
                    Edit
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 px-2"
                    onClick={() => handleRemove(admin.id)}
                  >
                    Remove
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
