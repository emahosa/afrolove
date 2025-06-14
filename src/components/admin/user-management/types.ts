
import { Database } from "@/integrations/supabase/types";

export type UserRole = Database["public"]["Enums"]["user_role"];

export interface User {
  id: string;
  name: string;
  email: string;
  status: "active" | "suspended"; // Made status more specific
  role: UserRole;
  credits: number;
  joinDate: string;
  permissions?: string[];
}

// This prop type is for the main UserManagement component, passed from Admin.tsx
export interface UserManagementContainerProps {
  users: User[];
  renderStatusLabel: (status: string) => React.ReactNode;
}
