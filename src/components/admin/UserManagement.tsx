
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

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

const userFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  credits: z.coerce.number().int().min(0, { message: "Credits cannot be negative." }),
});

export const UserManagement = ({ users, renderStatusLabel }: UserManagementProps) => {
  const [usersList, setUsersList] = useState<User[]>(users);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const form = useForm<z.infer<typeof userFormSchema>>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: "",
      email: "",
      credits: 0,
    },
  });

  const handleEdit = (userId: number) => {
    const user = usersList.find(user => user.id === userId);
    if (user) {
      setCurrentUser(user);
      form.reset({
        name: user.name,
        email: user.email,
        credits: user.credits,
      });
      setIsEditDialogOpen(true);
    }
  };

  const handleToggleBan = (userId: number, currentStatus: string) => {
    const newStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
    
    setUsersList(usersList.map(user => {
      if (user.id === userId) {
        toast.success(`User ${newStatus === 'suspended' ? 'banned' : 'unbanned'}`);
        return { ...user, status: newStatus };
      }
      return user;
    }));
  };

  const handleAddUser = () => {
    toast.info("Adding new user - this would open a form in a real application");
    // This would typically open a dialog for adding a new user
  };

  const onSubmitEdit = (values: z.infer<typeof userFormSchema>) => {
    if (currentUser) {
      setUsersList(usersList.map(user => 
        user.id === currentUser.id 
          ? { 
              ...user, 
              name: values.name, 
              email: values.email, 
              credits: values.credits 
            } 
          : user
      ));
      toast.success("User updated successfully");
      setIsEditDialogOpen(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">User Management</h2>
        <Button onClick={handleAddUser}>Add New User</Button>
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
            {usersList.map((user) => (
              <tr key={user.id} className="border-b">
                <td className="py-3 px-4">{user.name}</td>
                <td className="py-3 px-4">{user.email}</td>
                <td className="py-3 px-4">{renderStatusLabel(user.status)}</td>
                <td className="py-3 px-4">{user.role}</td>
                <td className="py-3 px-4">{user.credits}</td>
                <td className="py-3 px-4">{user.joinDate}</td>
                <td className="py-3 px-4 text-right">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 px-2"
                    onClick={() => handleEdit(user.id)}
                  >
                    Edit
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 px-2"
                    onClick={() => handleToggleBan(user.id, user.status)}
                  >
                    {user.status === 'suspended' ? 'Unban' : 'Ban'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Make changes to the user account details.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitEdit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="credits"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Credits</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Save Changes</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
