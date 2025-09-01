
import { z } from 'zod';

// User roles without affiliate
export const userRoleSchema = z.enum([
  'admin',
  'moderator', 
  'user',
  'super_admin',
  'voter',
  'subscriber',
  'contest_entrant'
]);

export const userManagementFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  role: userRoleSchema.default('user'),
  credits: z.number().min(0).default(0),
  status: z.enum(['active', 'suspended']).default('active'),
  is_suspended: z.boolean().default(false),
  is_banned: z.boolean().default(false),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
  confirmPassword: z.string().optional(),
}).refine((data) => {
  if (data.password && data.confirmPassword) {
    return data.password === data.confirmPassword;
  }
  return true;
}, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export type UserRole = z.infer<typeof userRoleSchema>;
export type UserManagementFormData = z.infer<typeof userManagementFormSchema>;
export type UserFormValues = UserManagementFormData;

export const roleLabels: Record<UserRole, string> = {
  admin: 'Administrator',
  moderator: 'Moderator',
  user: 'Regular User',
  super_admin: 'Super Administrator',
  voter: 'Voter',
  subscriber: 'Subscriber',
  contest_entrant: 'Contest Entrant',
};

export const ADMIN_PERMISSIONS = [
  { id: 'manage_users', label: 'Manage Users' },
  { id: 'manage_content', label: 'Manage Content' },
  { id: 'manage_settings', label: 'Manage Settings' },
  { id: 'view_analytics', label: 'View Analytics' },
];
