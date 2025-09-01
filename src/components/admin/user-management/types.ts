
export type UserRole = "admin" | "moderator" | "user" | "super_admin" | "voter" | "subscriber" | "contest_entrant" | "affiliate";

export interface User {
  id: string;
  name: string;
  email: string;
  credits: number;
  status: 'active' | 'suspended';
  role: UserRole;
  permissions?: string[];
}

export interface UserManagementContainerProps {
  users?: User[];
  renderStatusLabel?: (status: User['status']) => React.ReactNode;
}
