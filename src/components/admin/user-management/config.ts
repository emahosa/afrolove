
import * as z from 'zod';
import { UserRole } from './types'; // Ensure UserRole type is available for the schema

// Define an array of UserRole values for Zod enum
const userRoleValues = ["admin", "moderator", "user", "super_admin", "voter", "subscriber"] as const;

export const ADMIN_PERMISSIONS = [
  { id: 'users', label: 'User Management' },
  { id: 'content', label: 'Content Management' },
  { id: 'genres', label: 'Genre Management' },
  { id: 'custom-songs', label: 'Custom Songs' },
  { id: 'suno-api', label: 'Suno API' },
  { id: 'contest', label: 'Contest Management' },
  { id: 'payments', label: 'Payment Management' },
  { id: 'support', label: 'Support Management' },
  { id: 'reports', label: 'Reports & Analytics' },
  { id: 'settings', label: 'Settings Management' }
];

export const userFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  credits: z.coerce.number().int().min(0, { message: "Credits cannot be negative." }),
  status: z.enum(["active", "suspended"]).default("active"),
  role: z.enum(userRoleValues).default("voter" as UserRole),
  permissions: z.array(z.string()).optional(),
});

export type UserFormValues = z.infer<typeof userFormSchema>;
