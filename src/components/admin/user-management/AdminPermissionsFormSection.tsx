
import React from 'react';
import { FormLabel } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { ADMIN_PERMISSIONS } from './config';

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
        {ADMIN_PERMISSIONS.map(permission => (
          <div key={permission.id} className="flex items-center space-x-2">
            <Checkbox
              id={`${dialogType}-dialog-${permission.id}`}
              checked={selectedPermissions.includes(permission.id)}
              onCheckedChange={(checked) => 
                onPermissionChange(permission.id, checked as boolean)
              }
            />
            <label
              htmlFor={`${dialogType}-dialog-${permission.id}`}
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {permission.label}
            </label>
          </div>
        ))}
      </div>
    </div>
  );
};
