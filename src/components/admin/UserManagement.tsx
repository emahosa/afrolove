import { useState, useEffect } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { fetchUsersFromDatabase, updateUserInDatabase, toggleUserBanStatus, addUserToDatabase } from '@/utils/adminOperations';
import { Database } from "@/integrations/supabase/types";
import { 
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from '@/components/ui/table';

type UserRole = Database["public"]["Enums"]["user_role"];

interface User {
  id: string;
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
  status: z.enum(["active", "suspended"]).default("active"),
  role: z.enum(["admin", "moderator", "user"]).default("user"),
});

export const UserManagement = ({ users: initialUsers, renderStatusLabel }: UserManagementProps) => {
  const [usersList, setUsersList] = useState<User[]>(initialUsers);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof userFormSchema>>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: "",
      email: "",
      credits: 5,
      status: "active",
      role: "user",
    },
  });

  useEffect(() => {
    console.log("UserManagement: Received users prop:", initialUsers);
    if (initialUsers && initialUsers.length > 0) {
      console.log("Setting user list from props:", initialUsers);
      setUsersList(initialUsers);
      setLoadingError(null);
    } else if (initialUsers && initialUsers.length === 0) {
      console.log("Empty users array received");
      setUsersList([]);
      setLoadingError("No users found in the system");
    }
  }, [initialUsers]);

  const loadUsers = async () => {
    setIsLoading(true);
    setLoadingError(null);
    try {
      console.log("UserManagement: Loading users directly...");
      const loadedUsers = await fetchUsersFromDatabase();
      console.log(`UserManagement: Loaded ${loadedUsers.length} users:`, loadedUsers);
      setUsersList(loadedUsers);
      
      if (loadedUsers.length === 0) {
        setLoadingError("No users found. The database might be empty or there might be permission issues.");
        toast.info("No users found in the database");
      } else {
        toast.success(`Loaded ${loadedUsers.length} users`);
      }
    } catch (error: any) {
      console.error("UserManagement: Failed to load users:", error);
      setLoadingError(error.message || "Failed to load users. Please check your connection and permissions.");
      toast.error("Failed to load users", { description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (userId: string) => {
    const user = usersList.find(user => user.id === userId);
    if (user) {
      setCurrentUser(user);
      form.reset({
        name: user.name,
        email: user.email,
        credits: user.credits,
        status: user.status as "active" | "suspended",
        role: user.role as UserRole,
      });
      setIsEditDialogOpen(true);
    }
  };

  const handleToggleBan = async (userId: string, currentStatus: string) => {
    setIsLoading(true);
    try {
      const success = await toggleUserBanStatus(userId, currentStatus);
      if (success) {
        const newStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
        setUsersList(usersList.map(user => {
          if (user.id === userId) {
            toast.success(`User ${newStatus === 'suspended' ? 'banned' : 'unbanned'}`);
            return { ...user, status: newStatus };
          }
          return user;
        }));
      }
    } catch (error) {
      console.error("Failed to toggle ban status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddUser = () => {
    setCurrentUser(null);
    form.reset({
      name: "",
      email: "",
      credits: 5,
      status: "active",
      role: "user",
    });
    setIsAddDialogOpen(true);
  };

  const onSubmitEdit = async (values: z.infer<typeof userFormSchema>) => {
    if (currentUser) {
      setIsLoading(true);
      try {
        const success = await updateUserInDatabase(currentUser.id, values);
        if (success) {
          setUsersList(usersList.map(user => 
            user.id === currentUser.id 
              ? { 
                  ...user, 
                  name: values.name, 
                  email: values.email, 
                  credits: values.credits,
                  status: values.status || user.status,
                  role: values.role || user.role,
                } 
              : user
          ));
          toast.success("User updated successfully");
          setIsEditDialogOpen(false);
        }
      } catch (error) {
        console.error("Failed to update user:", error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const onSubmitAdd = async (values: z.infer<typeof userFormSchema>) => {
    setIsLoading(true);
    try {
      console.log("Adding user with values:", values);
      const newUserId = await addUserToDatabase(values);
      
      if (newUserId) {
        toast.success("New user added successfully");
        
        // Create a new user object to add to the list
        const newUser: User = {
          id: newUserId,
          name: values.name,
          email: values.email,
          credits: values.credits,
          status: values.status,
          role: values.role,
          joinDate: new Date().toISOString().split('T')[0]
        };
        
        // Add the new user to the list and close the dialog
        setUsersList([...usersList, newUser]);
        setIsAddDialogOpen(false);
        
        // Refresh the user list to ensure we have the latest data
        setTimeout(() => loadUsers(), 1000);
      } else {
        toast.error("Failed to add user");
      }
    } catch (error) {
      console.error("Failed to add user:", error);
      toast.error("An error occurred while adding the user");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">User Management</h2>
        <div className="space-x-2">
          <Button onClick={loadUsers} variant="outline" disabled={isLoading}>
            {isLoading ? 'Refreshing...' : 'Refresh Users'}
          </Button>
          <Button onClick={handleAddUser}>Add New User</Button>
        </div>
      </div>
      
      {isLoading && !usersList.length && (
        <div className="flex justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-melody-primary"></div>
          <span className="ml-2">Loading users...</span>
        </div>
      )}
      
      {loadingError && !isLoading && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-md">
          <p className="font-medium">Unable to load users</p>
          <p className="text-sm mt-1">{loadingError}</p>
          <Button onClick={loadUsers} className="mt-2" size="sm">
            Try Again
          </Button>
        </div>
      )}
      
      {!isLoading && usersList.length === 0 && !loadingError && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-md text-center">
          <p className="font-medium">No users found</p>
          <p className="text-sm mt-1">Get started by adding your first user</p>
          <Button onClick={handleAddUser} className="mt-2" size="sm">
            Add First User
          </Button>
        </div>
      )}
      
      {usersList.length > 0 && (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Credits</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usersList.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{renderStatusLabel(user.status)}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      user.role === 'admin' ? 'bg-red-100 text-red-800' :
                      user.role === 'moderator' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {user.role}
                    </span>
                  </TableCell>
                  <TableCell>{user.credits}</TableCell>
                  <TableCell>{user.joinDate}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 px-2"
                      onClick={() => handleEdit(user.id)}
                      disabled={isLoading}
                    >
                      Edit
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 px-2"
                      onClick={() => handleToggleBan(user.id, user.status)}
                      disabled={isLoading}
                    >
                      {user.status === 'suspended' ? 'Unban' : 'Ban'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

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
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="moderator">Moderator</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Add User Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Enter details for the new user account.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitAdd)} className="space-y-4">
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
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="moderator">Moderator</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Adding...' : 'Add User'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
