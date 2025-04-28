
import { User, Session } from "@supabase/supabase-js";

export interface UserProfile extends User {
  name?: string;
  avatar?: string;
  credits?: number;
  subscription?: string;
  voiceProfiles?: any[];
}

export interface AuthContextType {
  user: UserProfile | null;
  session: Session | null;
  loading: boolean;
  login: (email: string, password: string, isAdmin: boolean) => Promise<boolean>;
  register: (name: string, email: string, password: string, isAdmin: boolean) => Promise<boolean>;
  logout: () => Promise<void>;
  isAdmin: () => boolean;
  updateUserCredits: (amount: number) => void;
}

export interface ProfileData {
  name?: string;
  avatar_url?: string;
  full_name?: string;
  credits?: number;
  subscription?: string;
  voiceProfiles?: any[];
}

