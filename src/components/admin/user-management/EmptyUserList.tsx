
import React from 'react';
import { Button } from '@/components/ui/button';

interface EmptyUserListProps {
  onAddUser: () => void;
  isSuperAdmin: boolean;
}

export const EmptyUserList: React.FC<EmptyUserListProps> = ({
  onAddUser,
  isSuperAdmin,
}) => {
  return (
    <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-md text-center">
      <p className="font-medium">No users found</p>
      <p className="text-sm mt-1">Get started by adding your first user</p>
      {isSuperAdmin && (
        <Button onClick={onAddUser} className="mt-2" size="sm">
          Add First User
        </Button>
      )}
    </div>
  );
};
