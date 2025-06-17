
import { z } from 'zod';

export const userFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email is required'),
  credits: z.number().min(0, 'Credits must be non-negative'),
  status: z.enum(['active', 'suspended']).optional(),
  role: z.enum(['admin', 'moderator', 'user', 'super_admin', 'voter', 'subscriber', 'affiliate']).default('voter'),
  permissions: z.array(z.string()).optional(),
  password: z.string().min(8, 'Password must be at least 8 characters').optional().or(z.literal('')),
  confirmPassword: z.string().optional().or(z.literal('')),
}).refine((data) => {
  if (data.password && data.confirmPassword) {
    return data.password === data.confirmPassword;
  }
  return true;
}, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export type UserFormValues = z.infer<typeof userFormSchema>;

export const adminPermissions = [
  'manage_users',
  'manage_content',
  'manage_payments',
  'manage_settings',
  'view_analytics',
  'manage_contests',
  'manage_genres',
  'manage_affiliates',
  'manage_api_keys'
];
