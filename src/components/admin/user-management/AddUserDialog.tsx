
import React, { useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Button } from '@/components/ui/button';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AdminPermissionsFormSection } from './AdminPermissionsFormSection';
import { UserFormValues } from './config';
import { UserRole } from './types';

interface AddUserDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  form: UseFormReturn<UserFormValues>;
  onSubmit: (values: UserFormValues) => void;
  isLoading: boolean;
  selectedPermissions: string[];
  onPermissionChange: (permissionId: string, checked: boolean) => void;
  roleOptions: { value: string; label: string }[];
  onRoleChange: (role: string) => void;
  isSuperAdmin: boolean; // New prop
}

export const AddUserDialog: React.FC<AddUserDialogProps> = ({
  isOpen,
  onOpenChange,
  form,
  onSubmit,
  isLoading,
  selectedPermissions,
  onPermissionChange,
  roleOptions,
  onRoleChange,
  isSuperAdmin, // New prop
}) => {
  const watchedRole = form.watch('role');
  const showPasswordFields = isSuperAdmin && (watchedRole === 'admin' || watchedRole === 'super_admin');

  useEffect(() => {
    if (!showPasswordFields) {
      form.setValue('password', undefined);
      form.setValue('confirmPassword', undefined);
      form.clearErrors('password');
      form.clearErrors('confirmPassword');
    }
  }, [showPasswordFields, form]);
  
  const dialogDescription = showPasswordFields
    ? "Enter details for the new admin. You will set their initial password. They must confirm their email."
    : "Enter details for the new user account. An invitation email will be sent.";

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
          <DialogDescription>
            {dialogDescription}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                    <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)} />
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
                       field.onChange(value as UserRole);
                       onRoleChange(value); // This callback might also clear permissions if role is not admin
                    }}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {roleOptions.map(option => (
                        <SelectItem key={option.value} value={option.value as UserRole}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {showPasswordFields && (
              <>
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} placeholder="Enter initial password" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} placeholder="Confirm initial password" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {(watchedRole === 'admin' || watchedRole === 'super_admin') && (
              <AdminPermissionsFormSection
                selectedPermissions={selectedPermissions}
                onPermissionChange={onPermissionChange}
                dialogType="add"
              />
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Processing...' : (showPasswordFields ? 'Create User & Set Password' : 'Add & Invite User')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

