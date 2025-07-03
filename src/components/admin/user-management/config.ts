
import * as z from 'zod';
import { UserRole } from './types';

// Define an array of UserRole values for Zod enum - updated to include affiliate
const userRoleValues = ["admin", "moderator", "user", "super_admin", "voter", "subscriber", "affiliate", "contest_entrant"] as const;

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
  password: z.string().optional(),
  confirmPassword: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.password || data.confirmPassword) {
    if (!data.password || data.password.length === 0) {
      if (data.confirmPassword && data.confirmPassword.length > 0) {
         ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Password is required if confirm password is set.",
          path: ["password"],
        });
      }
    } else {
      if (data.password.length < 8) {
        ctx.addIssue({
          code: z.ZodIssueCode.too_small,
          minimum: 8,
          type: "string",
          inclusive: true,
          message: "Password must be at least 8 characters.",
          path: ["password"],
        });
      }
      if (data.password !== data.confirmPassword) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Passwords do not match.",
          path: ["confirmPassword"],
        });
      }
    }
  }
});

export type UserFormValues = z.infer<typeof userFormSchema>;
