
import React from 'react';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { User } from './types';

interface UserTableProps {
  users: User[];
  renderStatusLabel: (status: string) => React.ReactNode;
  isSuperAdmin: boolean;
  onEditUser: (userId: string) => void;
  onToggleBanUser: (userId: string, currentStatus: User['status']) => void;
  isLoading: boolean;
}

export const UserTable: React.FC<UserTableProps> = ({
  users,
  renderStatusLabel,
  isSuperAdmin,
  onEditUser,
  onToggleBanUser,
  isLoading,
}) => {
  return (
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
          {users.map((userItem) => (
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
                {isSuperAdmin && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2"
                      onClick={() => onEditUser(userItem.id)}
                      disabled={isLoading}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2"
                      onClick={() => onToggleBanUser(userItem.id, userItem.status)}
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
  );
};
