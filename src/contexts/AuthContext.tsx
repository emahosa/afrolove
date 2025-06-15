
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// A more robust user object that includes roles and profile data
interface ExtendedUser extends User {
  fullName?: string;
  avatarUrl?: string;
  credits: number;
  roles: string[];
  permissions: string[];
  isSubscriber: boolean;
  subscription?: string;
}

interface AuthContextType {
  user: ExtendedUser | null;
  session: Session | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (fullName: string, email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isAdmin: () => boolean;
  isSuperAdmin: () => boolean;
  isVoter: () => boolean;
  isSubscriber: () => boolean;
  hasAdminPermission: (permission: string) => boolean;
  canAccessFeature: (feature: string) => boolean;
  updateUserCredits: (amount: number) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<ExtendedUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // This listener is the single source of truth for auth state.
    // It runs once on initial load and whenever the auth state changes.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`AuthContext: Auth event: ${event}`);
      if (session?.user) {
        console.log("AuthContext: Session found, fetching user profile...");
        
        // Fetch all user-related data in one go
        const [profileRes, rolesRes, permissionsRes, subscriberRes, subscriptionRes] = await Promise.all([
          supabase.from('profiles').select('full_name, avatar_url, credits').eq('id', session.user.id).single(),
          supabase.from('user_roles').select('role').eq('user_id', session.user.id),
          supabase.from('admin_permissions').select('permission').eq('user_id', session.user.id),
          supabase.rpc('is_subscriber', { _user_id: session.user.id }),
          supabase.from('user_subscriptions').select('subscription_type').eq('user_id', session.user.id).eq('subscription_status', 'active').single()
        ]);

        const profile = profileRes.data;
        const roles = rolesRes.data?.map(r => r.role) || [];
        const permissions = permissionsRes.data?.map(p => p.permission) || [];
        const isSubscriberResult = subscriberRes.data || false;
        const subscriptionPlan = subscriptionRes.data?.subscription_type || 'free';

        const userProfile: ExtendedUser = {
          ...session.user,
          fullName: profile?.full_name || session.user.user_metadata.full_name,
          avatarUrl: profile?.avatar_url || session.user.user_metadata.avatar_url,
          credits: profile?.credits ?? 5,
          roles,
          permissions,
          isSubscriber: isSubscriberResult || roles.includes('subscriber'),
          subscription: subscriptionPlan,
        };

        setUser(userProfile);
        setSession(session);
        console.log("AuthContext: User state updated:", userProfile);
      } else {
        console.log("AuthContext: No session. Clearing user state.");
        setUser(null);
        setSession(null);
      }
      setLoading(false);
    });

    return () => {
      console.log("AuthContext: Unsubscribing from auth state changes.");
      subscription.unsubscribe();
    };
  }, []);

  const isSuperAdmin = useCallback(() => user?.email === 'ellaadahosa@gmail.com' || (user?.roles.includes('super_admin') ?? false), [user]);
  const isAdmin = useCallback(() => isSuperAdmin() || (user?.roles.includes('admin') ?? false), [user, isSuperAdmin]);
  const isVoter = useCallback(() => user?.roles.includes('voter') ?? false, [user]);
  const isSubscriber = useCallback(() => user?.isSubscriber ?? false, [user]);

  const hasAdminPermission = useCallback((permission: string) => {
    if (isSuperAdmin()) return true;
    return user?.permissions.includes(permission) ?? false;
  }, [user, isSuperAdmin]);

  const canAccessFeature = useCallback((feature: string) => {
    if (isSuperAdmin()) return true;
    
    // Regular admin needs specific permissions for admin features
    if (isAdmin() && feature.startsWith('admin_')) {
      return hasAdminPermission(feature.replace('admin_', ''));
    }
    
    // Subscribers can access all regular features
    if (isSubscriber()) return true;
    
    // Voters can only access contest features
    if (isVoter()) {
      return feature === 'contest' || feature === 'voting';
    }
    
    return false;
  }, [isAdmin, isSuperAdmin, isSubscriber, isVoter, hasAdminPermission]);

  const updateUserCredits = async (amount: number) => {
    if (!user) return;
    const { data, error } = await supabase.rpc('update_user_credits', {
      p_user_id: user.id,
      p_amount: amount
    });
    if (error) {
      console.error('Error updating credits:', error);
      throw error;
    }
    setUser(prev => prev ? { ...prev, credits: data } : null);
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error('Login error:', error.message);
      toast.error(error.message);
      return false;
    }
    return true;
  };

  const register = async (fullName: string, email: string, password: string): Promise<boolean> => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=random`
        },
        emailRedirectTo: `${window.location.origin}/dashboard`
      }
    });

    if (error) {
      console.error('Registration error:', error.message);
      toast.error(error.message);
      return false;
    }

    if (!data.session) {
      toast.success('Registration successful! Please check your email to verify your account.');
    }
    return true;
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(error.message);
    }
    // The auth listener will handle clearing user state.
  };

  const value = {
    user,
    session,
    loading,
    login,
    register,
    logout,
    isAdmin,
    isSuperAdmin,
    isVoter,
    isSubscriber,
    hasAdminPermission,
    canAccessFeature,
    updateUserCredits
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
