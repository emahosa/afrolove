
import { z } from 'zod';

// Remove affiliate from available roles
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
  role: userRoleSchema.default('user'),
  credits: z.number().min(0).default(0),
  is_suspended: z.boolean().default(false),
  is_banned: z.boolean().default(false),
});

export type UserRole = z.infer<typeof userRoleSchema>;
export type UserManagementFormData = z.infer<typeof userManagementFormSchema>;

export const roleLabels: Record<UserRole, string> = {
  admin: 'Administrator',
  moderator: 'Moderator',
  user: 'Regular User',
  super_admin: 'Super Administrator',
  voter: 'Voter',
  subscriber: 'Subscriber',
  contest_entrant: 'Contest Entrant',
};
