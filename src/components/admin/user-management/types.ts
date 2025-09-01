
import { Database } from "@/integrations/supabase/types";

export type UserRole = Database["public"]["Enums"]["user_role"];

export interface User {
  id: string;
  name: string;
  email: string;
  status: "active" | "suspended";
  role: UserRole;
  credits: number;
  joinDate: string;
  permissions?: string[];
}

export interface UserManagementContainerProps {
  users: User[];
  renderStatusLabel: (status: string) => React.ReactNode;
}
