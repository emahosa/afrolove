
import { Button } from '@/components/ui/button';

interface User {
  id: number;
  name: string;
  email: string;
  status: string;
  role: string;
  credits: number;
  joinDate: string;
}

interface UserManagementProps {
  users: User[];
  renderStatusLabel: (status: string) => React.ReactNode;
}

export const UserManagement = ({ users, renderStatusLabel }: UserManagementProps) => {
  return (
    <div className="space-y-4">
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
    </div>
  );
};
