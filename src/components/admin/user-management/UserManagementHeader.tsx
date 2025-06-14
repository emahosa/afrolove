
import React from 'react';
import { Button } from '@/components/ui/button';

interface UserManagementHeaderProps {
  onRefreshUsers: () => void;
  onAddUser: () => void;
  isLoading: boolean;
  isSuperAdmin: boolean;
}

export const UserManagementHeader: React.FC<UserManagementHeaderProps> = ({
  onRefreshUsers,
  onAddUser,
  isLoading,
  isSuperAdmin,
}) => {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-2xl font-bold">User Management</h2>
      <div className="space-x-2">
        <Button onClick={onRefreshUsers} variant="outline" disabled={isLoading}>
          {isLoading ? 'Refreshing...' : 'Refresh Users'}
        </Button>
        {isSuperAdmin && (
          <Button onClick={onAddUser}>Add New User</Button>
        )}
      </div>
    </div>
  );
};
