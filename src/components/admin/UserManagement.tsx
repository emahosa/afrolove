import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { fetchUsersFromDatabase, updateUserInDatabase, toggleUserBanStatus } from '@/utils/adminOperations';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

import { User, UserRole, UserManagementContainerProps } from './user-management/types';
import { userFormSchema, UserFormValues } from './user-management/config';
import { UserManagementHeader } from './user-management/UserManagementHeader';
import { EmptyUserList } from './user-management/EmptyUserList';
import { UserTable } from './user-management/UserTable';
import { EditUserDialog } from './user-management/EditUserDialog';
import { AddUserDialog } from './user-management/AddUserDialog';

export const UserManagement = ({ users: initialUsers = [], renderStatusLabel }: UserManagementContainerProps) => {
  const { user: currentAuthUser, isSuperAdmin } = useAuth();
  const [usersList, setUsersList] = useState<User[]>(initialUsers);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [currentUserToEdit, setCurrentUserToEdit] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: "",
      email: "",
      credits: 5,
      status: "active",
      role: "voter" as UserRole,
      permissions: [],
      password: "",
      confirmPassword: "",
    },
  });

  // Auto-load users when component mounts if no initial users provided
  useEffect(() => {
    console.log("UserManagement: Received users prop:", initialUsers);
    if (initialUsers.length === 0) {
      console.log("UserManagement: No initial users, loading from database...");
      loadUsers();
    } else {
      setUsersList(initialUsers);
    }
  }, [initialUsers]);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      console.log("UserManagement: Loading users directly...");
      const loadedUsers = await fetchUsersFromDatabase();
      console.log(`UserManagement: Loaded ${loadedUsers.length} users:`, loadedUsers);
      const typedUsers = loadedUsers.map(u => ({
        ...u,
        status: u.status === 'suspended' ? 'suspended' : 'active',
        role: u.role as UserRole,
      })) as User[];
      setUsersList(typedUsers);
      
      if (typedUsers.length === 0) {
        toast.info("No users found in the database");
      } else {
        toast.success(`Loaded ${typedUsers.length} users`);
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
        status: userToEdit.status,
        role: userToEdit.role,
        permissions: userToEdit.permissions || [],
        password: "",
        confirmPassword: "",
      });
      if (userToEdit.role === 'admin' && userToEdit.permissions) {
        setSelectedPermissions(userToEdit.permissions);
      } else {
        setSelectedPermissions([]);
      }
      setIsEditDialogOpen(true);
    }
  };

  const handleToggleBan = async (userId: string, currentStatus: User['status']) => {
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
      toast.error("Failed to toggle ban status");
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
      role: "voter" as UserRole,
      permissions: [],
      password: "",
      confirmPassword: "",
    });
    setIsAddDialogOpen(true);
  };

  const onSubmitEdit = async (values: UserFormValues) => {
    if (currentUserToEdit) {
      setIsLoading(true);
      try {
        const permissionsToUpdate = (values.role === 'admin' || values.role === 'super_admin') ? selectedPermissions : undefined;
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

  const onSubmitAdd = async (values: UserFormValues) => {
    setIsLoading(true);
    try {
      console.log("Adding user with values:", values);
      const { name, email, credits, role, password } = values;
      
      const appBaseUrl = import.meta.env.VITE_APP_BASE_URL || window.location.origin;
      console.log("UserManagement: Using appBaseUrl for invitation:", appBaseUrl);

      const body: any = {
        email,
        fullName: name,
        role,
        permissions: (role === 'admin' || role === 'super_admin') ? selectedPermissions : undefined,
        credits,
        appBaseUrl: appBaseUrl,
      };

      if (password && password.length >= 8 && (role === 'admin' || role === 'super_admin') && isSuperAdmin()) {
        body.password = password;
      }

      const { data: edgeFnData, error: edgeFnError } = await supabase.functions.invoke('admin-create-user', {
        body: body
      });

      if (edgeFnError) {
        console.error("Error calling admin-create-user Edge Function:", edgeFnError);
        throw new Error(edgeFnError.message || "Edge function call failed");
      }
      
      if (edgeFnData.error) {
        console.error("Error from admin-create-user Edge Function:", edgeFnData.error);
        throw new Error(edgeFnData.error || "Edge function returned an error");
      }

      toast.success(edgeFnData.message || "User processing complete.");
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
    if (role !== 'admin' && role !== 'super_admin') {
      setSelectedPermissions([]);
      form.setValue('permissions', []);
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
    const baseOptions = [
      { value: "voter", label: "Voter" },
      { value: "subscriber", label: "Subscriber" },
      { value: "user", label: "User" },
      { value: "moderator", label: "Moderator" },
      { value: "affiliate", label: "Affiliate" },
    ];
    if (isSuperAdmin()) {
      return [
        ...baseOptions,
        { value: "admin", label: "Admin" },
        { value: "super_admin", label: "Super Admin" }
      ];
    }
    return baseOptions;
  };

  return (
    <div className="space-y-4">
      <UserManagementHeader
        onRefreshUsers={loadUsers}
        onAddUser={handleAddUser}
        isLoading={isLoading}
        isSuperAdmin={isSuperAdmin()}
      />
      
      {usersList.length === 0 && !isLoading && (
        <EmptyUserList
          onAddUser={handleAddUser}
          isSuperAdmin={isSuperAdmin()}
        />
      )}
      
      {usersList.length > 0 && (
        <UserTable
          users={usersList}
          renderStatusLabel={renderStatusLabel}
          isSuperAdmin={isSuperAdmin()}
          onEditUser={handleEdit}
          onToggleBanUser={handleToggleBan}
          isLoading={isLoading}
        />
      )}

      <EditUserDialog
        isOpen={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        form={form}
        onSubmit={onSubmitEdit}
        isLoading={isLoading}
        selectedPermissions={selectedPermissions}
        onPermissionChange={handlePermissionChange}
        roleOptions={getRoleOptions()}
        onRoleChange={handleRoleChange}
      />

      {isSuperAdmin() && (
        <AddUserDialog
          isOpen={isAddDialogOpen}
          onOpenChange={setIsAddDialogOpen}
          form={form}
          onSubmit={onSubmitAdd}
          isLoading={isLoading}
          selectedPermissions={selectedPermissions}
          onPermissionChange={handlePermissionChange}
          roleOptions={getRoleOptions()}
          onRoleChange={handleRoleChange}
          isSuperAdmin={isSuperAdmin()}
        />
      )}
    </div>
  );
};

export default UserManagement;
