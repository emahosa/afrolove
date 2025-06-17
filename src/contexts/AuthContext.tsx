
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { handleReferralParams } from '@/utils/referralTracking';

interface ExtendedUser extends User {
  name?: string;
  avatar?: string;
  credits?: number;
  subscription?: 'free' | 'premium' | 'enterprise';
}

type LoginResponse = Awaited<ReturnType<typeof supabase.auth.signInWithPassword>>;

interface AuthContextType {
  user: ExtendedUser | null;
  session: Session | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<LoginResponse>;
  register: (fullName: string, email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isAdmin: () => boolean;
  isSuperAdmin: () => boolean;
  isVoter: () => boolean;
  isSubscriber: () => boolean;
  isAffiliate: () => boolean;
  hasAdminPermission: (permission: string) => boolean;
  canAccessFeature: (feature: string) => boolean;
  userRoles: string[];
  adminPermissions: string[];
  updateUserCredits: (amount: number) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<ExtendedUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [adminPermissions, setAdminPermissions] = useState<string[]>([]);
  const [subscriberStatus, setSubscriberStatus] = useState(false);
  const processedUserId = useRef<string | null>(null);

  console.log('🔐 AuthContext state:', { 
    userEmail: user?.email, 
    roles: userRoles, 
    permissions: adminPermissions,
    subscriberStatus,
    loading 
  });

  const isSuperAdmin = useCallback(() => {
    console.log('AuthContext: Checking super admin status for user:', user?.email);
    
    // Check if super admin by email first
    if (user?.email === 'ellaadahosa@gmail.com') {
      console.log('AuthContext: Super admin detected by email');
      return true;
    }
    
    // Check if user has super_admin role
    const hasSuperAdminRole = userRoles.includes('super_admin');
    console.log('AuthContext: Super admin role check:', hasSuperAdminRole);
    return hasSuperAdminRole;
  }, [user, userRoles]);

  const isAdmin = useCallback(() => {
    console.log('AuthContext: Checking admin status for user:', user?.email);
    
    // Super admin is also admin
    if (isSuperAdmin()) {
      console.log('AuthContext: Super admin detected');
      return true;
    }
    
    // Check if user has admin role
    const hasAdminRole = userRoles.includes('admin');
    console.log('AuthContext: Regular admin check, roles:', userRoles, 'hasAdmin:', hasAdminRole);
    return hasAdminRole;
  }, [isSuperAdmin, userRoles]);

  const isVoter = useCallback(() => {
    const hasVoterRole = userRoles.includes('voter');
    console.log('AuthContext: Voter check:', { roles: userRoles, hasVoterRole });
    return hasVoterRole;
  }, [userRoles]);

  const isSubscriber = useCallback(() => {
    const hasSubscriberRole = userRoles.includes('subscriber');
    const result = hasSubscriberRole || subscriberStatus;
    console.log('AuthContext: Subscriber check:', { 
      roles: userRoles, 
      hasSubscriberRole, 
      subscriberStatus, 
      result 
    });
    return result;
  }, [userRoles, subscriberStatus]);

  const isAffiliate = useCallback(() => {
    const hasAffiliateRole = userRoles.includes('affiliate');
    console.log('AuthContext: Affiliate check:', { roles: userRoles, hasAffiliateRole });
    return hasAffiliateRole;
  }, [userRoles]);

  const hasAdminPermission = useCallback((permission: string) => {
    // Super admin has all permissions
    if (isSuperAdmin()) return true;
    // Regular admin only has specific permissions
    return adminPermissions.includes(permission);
  }, [isSuperAdmin, adminPermissions]);

  const canAccessFeature = useCallback((feature: string) => {
    // Super admin can access everything
    if (isSuperAdmin()) return true;
    
    // Regular admin needs specific permissions for admin features
    if (isAdmin() && feature.startsWith('admin_')) {
      return hasAdminPermission(feature.replace('admin_', ''));
    }
    
    // Affiliates can access affiliate features
    if (isAffiliate() && feature === 'affiliate') return true;
    
    // Subscribers can access all regular features
    if (isSubscriber()) return true;
    
    // Voters can only access contest features
    if (isVoter()) {
      return feature === 'contest' || feature === 'voting';
    }
    
    return false;
  }, [isAdmin, isSuperAdmin, isSubscriber, isVoter, isAffiliate, hasAdminPermission]);

  const updateUserCredits = async (amount: number) => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase.rpc('update_user_credits', {
        p_user_id: user.id,
        p_amount: amount
      });
      
      if (error) throw error;
      
      setUser(prev => prev ? { ...prev, credits: data } : null);
    } catch (error) {
      console.error('Error updating credits:', error);
      throw error;
    }
  };

  const login = async (email: string, password: string): Promise<LoginResponse> => {
    console.log('AuthContext: Attempting login for:', email);
    // The onAuthStateChange listener will handle the session and user state updates.
    return supabase.auth.signInWithPassword({
      email,
      password,
    });
  };

  const register = async (fullName: string, email: string, password: string): Promise<boolean> => {
    try {
      console.log('AuthContext: Attempting registration for:', email);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=random`
          }
        }
      });

      if (error) {
        console.error('AuthContext: Registration error:', error);
        throw error;
      }

      if (data.user) {
        console.log('AuthContext: Registration successful for:', data.user.id);
        
        // Handle referral tracking for new users
        if (data.session) {
          await handleReferralParams(data.user.id);
        }
        
        if (data.session) {
          return true;
        } else {
          toast.success('Registration successful! Please check your email to verify your account.');
          return true;
        }
      }
      return false;
    } catch (error: any) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      console.log('AuthContext: Logging out user');
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('Logout error:', error);
        toast.error(error.message || 'Logout failed.');
        throw error;
      }
      
      // State is now cleared by the useEffect watching `session`
      toast.success("You have been logged out.");
    } catch (error: any) {
      console.error('Logout error:', error);
      toast.error(error.message || 'An unexpected error occurred during logout.');
      throw error;
    }
  };

  useEffect(() => {
    setLoading(true);
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    // This helps to set loading to false faster if user is not logged in.
    supabase.auth.getSession().then(({ data }) => {
        if (!data.session) {
            setLoading(false);
        }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const processAndFetch = async () => {
      if (session) {
        // Prevent re-processing on token refresh if user is the same
        if (processedUserId.current === session.user.id) {
          if (loading) setLoading(false);
          return;
        }

        try {
          const userId = session.user.id;
          console.log('AuthContext: Processing session for user:', userId);

          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle();
            
          const { data: userRoleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', userId);
          const roles = userRoleData?.map(r => r.role) || ['voter'];
          setUserRoles(roles);

          const { data: permissionsData } = await supabase
            .from('admin_permissions')
            .select('permission')
            .eq('user_id', userId);
          const permissions = permissionsData?.map(p => p.permission) || [];
          setAdminPermissions(permissions);

          const { data: isSubscriberResult } = await supabase
            .rpc('is_subscriber', { _user_id: userId });
          setSubscriberStatus(!!isSubscriberResult);

          // Handle referral tracking for existing users (if they have a ref param)
          await handleReferralParams(userId);
          
          const fullUser: ExtendedUser = {
            ...session.user,
            name: profile?.full_name || session.user.user_metadata.full_name || session.user.email?.split('@')[0] || 'User',
            avatar: profile?.avatar_url || session.user.user_metadata.avatar_url || '',
            credits: profile?.credits ?? 5,
            subscription: 'free' // This can be enhanced later based on subscription status
          };

          setUser(fullUser);
          processedUserId.current = userId;
          console.log('AuthContext: User setup complete for:', fullUser.name);

        } catch (error) {
          console.error('AuthContext: Error processing session:', error);
          setUser(null);
          setUserRoles([]);
          setAdminPermissions([]);
          setSubscriberStatus(false);
          processedUserId.current = null;
        }
      } else {
        // Session is null, clear everything
        setUser(null);
        setSession(null);
        setUserRoles([]);
        setAdminPermissions([]);
        setSubscriberStatus(false);
        processedUserId.current = null;
      }
      
      if (loading) {
        setLoading(false);
      }
    };

    processAndFetch();
  }, [session, loading]);

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
    isAffiliate,
    hasAdminPermission,
    canAccessFeature,
    userRoles,
    adminPermissions,
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
