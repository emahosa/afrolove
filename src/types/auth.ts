
import { User, Session } from "@supabase/supabase-js";

export interface UserProfile extends User {
  name: string;
  avatar: string;
  credits: number;
  subscription: 'free' | 'premium' | 'enterprise';
}

export interface AuthContextType {
  user: UserProfile | null;
  session: Session | null;
  loading: boolean;
  login: (email: string, password: string, isAdmin?: boolean) => Promise<boolean>;
  register: (name: string, email: string, password: string, referralCode?: string | null) => Promise<boolean>;
  logout: () => Promise<void>;
  isAdmin: () => boolean;
  isSuperAdmin: () => boolean;
  isSubscriber: () => boolean;
  isVoter: () => boolean;
  isAffiliate: () => boolean;
  hasRole: (role: string) => boolean;
  hasAdminPermission: (permission: string) => boolean;
  updateUserCredits: (amount: number) => Promise<void>;
  mfaEnabled: boolean;
}
