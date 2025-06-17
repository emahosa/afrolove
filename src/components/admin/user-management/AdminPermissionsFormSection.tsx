
import React from 'react';
import { FormLabel } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { adminPermissions } from './config';

interface AdminPermissionsFormSectionProps {
  selectedPermissions: string[];
  onPermissionChange: (permissionId: string, checked: boolean) => void;
  dialogType: 'add' | 'edit';
}

export const AdminPermissionsFormSection: React.FC<AdminPermissionsFormSectionProps> = ({
  selectedPermissions,
  onPermissionChange,
  dialogType,
}) => {
  return (
    <div className="space-y-3">
      <FormLabel>Admin Permissions</FormLabel>
      <div className="grid grid-cols-2 gap-2">
        {adminPermissions.map(permission => (
          <div key={permission} className="flex items-center space-x-2">
            <Checkbox
              id={`${dialogType}-dialog-${permission}`}
              checked={selectedPermissions.includes(permission)}
              onCheckedChange={(checked) => 
                onPermissionChange(permission, checked as boolean)
              }
            />
            <label
              htmlFor={`${dialogType}-dialog-${permission}`}
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {permission.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </label>
          </div>
        ))}
      </div>
    </div>
  );
};
