import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
  register: (fullName: string, email: string, password: string, referralCode?: string | null) => Promise<boolean>;
  logout: () => Promise<void>;
  isAdmin: () => boolean;
  isSuperAdmin: () => boolean;
  isVoter: () => boolean;
  isSubscriber: () => boolean;
  hasAdminPermission: (permission: string) => boolean;
  canAccessFeature: (feature: string) => boolean;
  userRoles: string[];
  adminPermissions: string[];
  updateUserCredits: (amount: number) => Promise<void>;
  isAffiliate: () => boolean;
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
    
    const result = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    // Special handling for admin users
    if (result.data.session && email === "ellaadahosa@gmail.com") {
      console.log('AuthContext: Super admin login detected');
      // The onAuthStateChange listener will handle the session and user state updates
    }

    return result;
  };

  const register = async (fullName: string, email: string, password: string, referralCode?: string | null): Promise<boolean> => {
    try {
      console.log('AuthContext: Attempting registration for:', email, 'Referral Code:', referralCode);
      
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

        // Explicitly assign 'voter' role to new user
        try {
          const { error: roleError } = await supabase
            .from('user_roles')
            .insert({ user_id: data.user.id, role: 'voter' });

          if (roleError) {
            console.error('AuthContext: Error assigning default voter role:', roleError.message);
            // Decide if this should be a critical error. For now, log and continue.
            // If the fallback in the role fetching logic (`|| ['voter']`) is reliable,
            // this might not need to throw the main registration promise.
          } else {
            console.log('AuthContext: Default voter role assigned to user:', data.user.id);
          }
        } catch (e: any) {
          console.error('AuthContext: Exception assigning default voter role:', e.message);
        }

        if (referralCode) {
          try {
            console.log('AuthContext: Processing referral code:', referralCode);
            const { data: affiliateData, error: affiliateError } = await supabase
              .from('affiliate_applications')
              .select('user_id')
              .eq('unique_referral_code', referralCode)
              .eq('status', 'approved')
              .limit(1)
              .single();

            if (affiliateError) {
              console.error('AuthContext: Error querying affiliate application by referral code:', affiliateError.message);
              // Do not throw, let registration proceed
            }

            if (affiliateData && affiliateData.user_id) {
              const affiliateUserId = affiliateData.user_id;
              console.log('AuthContext: Found affiliate user ID:', affiliateUserId, 'for referral code:', referralCode);

              const { error: profileUpdateError } = await supabase
                .from('profiles')
                .update({ referrer_id: affiliateUserId })
                .eq('id', data.user.id);

              if (profileUpdateError) {
                console.error('AuthContext: Error updating profile with referrer_id:', profileUpdateError.message);
                // Do not throw, let registration proceed
              } else {
                console.log('AuthContext: Successfully updated profile for user', data.user.id, 'with referrer_id', affiliateUserId);
              }
            } else {
              console.log('AuthContext: No approved affiliate found for referral code:', referralCode);
            }
          } catch (referralProcessingError: any) {
            console.error('AuthContext: Unexpected error during referral processing:', referralProcessingError.message);
            // Do not throw, let registration proceed
          }
        }

        if (data.session) {
          // User might be auto-logged in if email verification is not required or already verified.
          return true;
        } else {
          // Standard flow: email verification required.
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
      
      // Force redirect to home page after logout
      window.location.href = '/';
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
          
          const fullUser: ExtendedUser = {
            ...session.user,
            name: profile?.full_name || session.user.user_metadata.full_name || session.user.email?.split('@')[0] || 'User',
            avatar: profile?.avatar_url || session.user.user_metadata.avatar_url || '',
            credits: profile?.credits ?? 5,
            subscription: 'free'
          };

          setUser(fullUser);
          processedUserId.current = userId;
          console.log('AuthContext: User setup complete for:', fullUser.name);

          // Auto-redirect admins to admin panel if they're not already there
          if ((fullUser.email === "ellaadahosa@gmail.com" || roles.includes('admin') || roles.includes('super_admin'))) {
            const currentPath = window.location.pathname;
            if (!currentPath.startsWith('/admin') && currentPath !== '/admin/login') {
              console.log('AuthContext: Admin user detected, redirecting to admin panel');
              window.location.href = '/admin';
            }
          }

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
    hasAdminPermission,
    canAccessFeature,
    userRoles,
    adminPermissions,
    updateUserCredits,
    isAffiliate
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
