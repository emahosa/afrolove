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
import { Checkbox } from '@/components/ui/checkbox';
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
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

type UserRole = Database["public"]["Enums"]["user_role"];

interface User {
  id: string;
  name: string;
  email: string;
  status: string;
  role: string;
  credits: number;
  joinDate: string;
  permissions?: string[]; // Added optional permissions
}

interface UserManagementProps {
  users: User[];
  renderStatusLabel: (status: string) => React.ReactNode;
}

const ADMIN_PERMISSIONS = [
  { id: 'users', label: 'User Management' },
  { id: 'content', label: 'Content Management' },
  { id: 'genres', label: 'Genre Management' },
  { id: 'custom-songs', label: 'Custom Songs' },
  { id: 'suno-api', label: 'Suno API' },
  { id: 'contest', label: 'Contest Management' },
  { id: 'payments', label: 'Payment Management' },
  { id: 'support', label: 'Support Management' },
  { id: 'reports', label: 'Reports & Analytics' },
  { id: 'settings', label: 'Settings Management' }
];

const userFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  credits: z.coerce.number().int().min(0, { message: "Credits cannot be negative." }),
  status: z.enum(["active", "suspended"]).default("active"),
  role: z.enum(["admin", "moderator", "user", "super_admin", "voter", "subscriber"]).default("voter"),
  permissions: z.array(z.string()).optional(),
});

export const UserManagement = ({ users: initialUsers, renderStatusLabel }: UserManagementProps) => {
  const { user: currentAuthUser, isSuperAdmin } = useAuth();
  const [usersList, setUsersList] = useState<User[]>(initialUsers);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [currentUserToEdit, setCurrentUserToEdit] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  const form = useForm<z.infer<typeof userFormSchema>>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: "",
      email: "",
      credits: 5,
      status: "active",
      role: "voter",
      permissions: [],
    },
  });

  useEffect(() => {
    console.log("UserManagement: Received users prop:", initialUsers);
    setUsersList(initialUsers);
  }, [initialUsers]);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      console.log("UserManagement: Loading users directly...");
      const loadedUsers = await fetchUsersFromDatabase();
      console.log(`UserManagement: Loaded ${loadedUsers.length} users:`, loadedUsers);
      setUsersList(loadedUsers);
      
      if (loadedUsers.length === 0) {
        toast.info("No users found in the database");
      } else {
        toast.success(`Loaded ${loadedUsers.length} users`);
      }
    } catch (error: any) {
      console.error("UserManagement: Failed to load users:", error);
      toast.error("Failed to load users", { description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (userId: string) => {
    const userToEdit = usersList.find(user => user.id === userId);
    if (userToEdit) {
      setCurrentUserToEdit(userToEdit);
      form.reset({
        name: userToEdit.name,
        email: userToEdit.email,
        credits: userToEdit.credits,
        status: userToEdit.status as "active" | "suspended",
        role: userToEdit.role as UserRole,
        permissions: userToEdit.permissions || [],
      });
      if (userToEdit.role === 'admin' && userToEdit.permissions) {
        setSelectedPermissions(userToEdit.permissions);
      } else {
        setSelectedPermissions([]);
      }
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
    setCurrentUserToEdit(null);
    setSelectedPermissions([]);
    form.reset({
      name: "",
      email: "",
      credits: 5,
      status: "active",
      role: "voter",
      permissions: [],
    });
    setIsAddDialogOpen(true);
  };

  const onSubmitEdit = async (values: z.infer<typeof userFormSchema>) => {
    if (currentUserToEdit) {
      setIsLoading(true);
      try {
        const permissionsToUpdate = values.role === 'admin' ? selectedPermissions : undefined;
        const success = await updateUserInDatabase(currentUserToEdit.id, { ...values, permissions: permissionsToUpdate });
        if (success) {
          setUsersList(usersList.map(user =>
            user.id === currentUserToEdit.id
              ? {
                  ...user,
                  name: values.name,
                  email: values.email,
                  credits: values.credits,
                  status: values.status || user.status,
                  role: values.role || user.role,
                  permissions: permissionsToUpdate || user.permissions,
                }
              : user
          ));
          toast.success("User updated successfully");
          setIsEditDialogOpen(false);
        }
      } catch (error) {
        console.error("Failed to update user:", error);
        toast.error("Failed to update user");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const onSubmitAdd = async (values: z.infer<typeof userFormSchema>) => {
    setIsLoading(true);
    try {
      console.log("Adding user with values:", values);
      const { name, email, credits, role } = values;

      const { data: edgeFnData, error: edgeFnError } = await supabase.functions.invoke('admin-create-user', {
        body: {
          email,
          fullName: name,
          role,
          permissions: role === 'admin' ? selectedPermissions : undefined,
          credits,
          appBaseUrl: window.location.origin, // Added appBaseUrl
        }
      });

      if (edgeFnError) {
        console.error("Error calling admin-create-user Edge Function:", edgeFnError);
        throw new Error(edgeFnError.message || "Edge function call failed");
      }
      
      if (edgeFnData.error) {
        console.error("Error from admin-create-user Edge Function:", edgeFnData.error);
        throw new Error(edgeFnData.error || "Edge function returned an error");
      }

      toast.success(edgeFnData.message || "New user invited successfully. They will receive an email to set up their account.");
      setIsAddDialogOpen(false);
      
      setTimeout(() => loadUsers(), 1000);

    } catch (error: any) {
      console.error("Failed to add user:", error);
      toast.error("Failed to add user", { description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleChange = (role: string) => {
    form.setValue('role', role as UserRole);
    // Reset permissions when role changes
    if (role !== 'admin') {
      setSelectedPermissions([]);
    }
  };

  const handlePermissionChange = (permission: string, checked: boolean) => {
    if (checked) {
      setSelectedPermissions(prev => [...prev, permission]);
    } else {
      setSelectedPermissions(prev => prev.filter(p => p !== permission));
    }
  };

  const getRoleOptions = () => {
    if (isSuperAdmin()) {
      return [
        { value: "voter", label: "Voter" },
        { value: "subscriber", label: "Subscriber" },
        { value: "user", label: "User" },
        { value: "moderator", label: "Moderator" },
        { value: "admin", label: "Admin" },
        { value: "super_admin", label: "Super Admin" }
      ];
    } else {
      return [
        { value: "voter", label: "Voter" },
        { value: "subscriber", label: "Subscriber" },
        { value: "user", label: "User" },
        { value: "moderator", label: "Moderator" }
      ];
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
          {isSuperAdmin() && (
            <Button onClick={handleAddUser}>Add New User</Button>
          )}
        </div>
      </div>
      
      {usersList.length === 0 && !isLoading && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-md text-center">
          <p className="font-medium">No users found</p>
          <p className="text-sm mt-1">Get started by adding your first user</p>
          {isSuperAdmin() && (
            <Button onClick={handleAddUser} className="mt-2" size="sm">
              Add First User
            </Button>
          )}
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
              {usersList.map((userItem) => (
                <TableRow key={userItem.id}>
                  <TableCell className="font-medium">{userItem.name}</TableCell>
                  <TableCell>{userItem.email}</TableCell>
                  <TableCell>{renderStatusLabel(userItem.status)}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      userItem.role === 'super_admin' ? 'bg-purple-100 text-purple-800' :
                      userItem.role === 'admin' ? 'bg-red-100 text-red-800' :
                      userItem.role === 'moderator' ? 'bg-yellow-100 text-yellow-800' :
                      userItem.role === 'subscriber' ? 'bg-green-100 text-green-800' :
                      userItem.role === 'voter' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {userItem.role}
                    </span>
                  </TableCell>
                  <TableCell>{userItem.credits}</TableCell>
                  <TableCell>{userItem.joinDate}</TableCell>
                  <TableCell className="text-right space-x-1">
                    {isSuperAdmin() && (
                      <>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 px-2"
                          onClick={() => handleEdit(userItem.id)}
                          disabled={isLoading}
                        >
                          Edit
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 px-2"
                          onClick={() => handleToggleBan(userItem.id, userItem.status)}
                          disabled={isLoading}
                        >
                          {userItem.status === 'suspended' ? 'Unban' : 'Ban'}
                        </Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
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
                      onValueChange={(value) => {
                        field.onChange(value); 
                        handleRoleChange(value); 
                      }} 
                      value={field.value} 
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {getRoleOptions().map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {form.watch('role') === 'admin' && (
                <div className="space-y-3">
                  <FormLabel>Admin Permissions</FormLabel>
                  <div className="grid grid-cols-2 gap-2">
                    {ADMIN_PERMISSIONS.map(permission => (
                      <div key={permission.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`edit-dialog-${permission.id}`}
                          checked={selectedPermissions.includes(permission.id)}
                          onCheckedChange={(checked) => 
                            handlePermissionChange(permission.id, checked as boolean)
                          }
                        />
                        <label 
                          htmlFor={`edit-dialog-${permission.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {permission.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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

      {/* Add User Dialog - Only for Super Admin */}
      {isSuperAdmin() && (
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
              <DialogDescription>
                Enter details for the new user account. An invitation email will be sent.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmitAdd)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter user's full name" />
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
                        <Input {...field} type="email" placeholder="Enter user's email" />
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
                      <FormLabel>Initial Credits</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
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
                        onValueChange={(value) => {
                           field.onChange(value); 
                           handleRoleChange(value); 
                        }}
                        value={field.value} 
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {getRoleOptions().map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {form.watch('role') === 'admin' && (
                  <div className="space-y-3">
                    <FormLabel>Admin Permissions</FormLabel>
                    <div className="grid grid-cols-2 gap-2">
                      {ADMIN_PERMISSIONS.map(permission => (
                        <div key={permission.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`add-dialog-${permission.id}`}
                            checked={selectedPermissions.includes(permission.id)}
                            onCheckedChange={(checked) => 
                              handlePermissionChange(permission.id, checked as boolean)
                            }
                          />
                          <label 
                            htmlFor={`add-dialog-${permission.id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {permission.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? 'Adding & Inviting...' : 'Add & Invite User'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
