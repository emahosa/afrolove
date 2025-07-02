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
  affiliateApplicationStatus: 'unknown' | 'not_eligible_not_subscriber' | 'eligible' | 'pending' | 'approved' | 'rejected' | 'not_applicable_is_affiliate';
  refreshAffiliateApplicationStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export type AffiliateApplicationStatus = 'unknown' | 'not_eligible_not_subscriber' | 'eligible' | 'pending' | 'approved' | 'rejected' | 'not_applicable_is_affiliate';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<ExtendedUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [adminPermissions, setAdminPermissions] = useState<string[]>([]);
  const [subscriberStatus, setSubscriberStatus] = useState(false);
  const [affiliateApplicationStatus, setAffiliateApplicationStatus] = useState<AffiliateApplicationStatus>('unknown');
  const processedUserId = useRef<string | null>(null);

  // console.log('🔐 AuthContext state:', { // Reduced console noise
  //   userEmail: user?.email,
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
    // Rely solely on the 'subscriber' role being present in userRoles.
    // Assumes that database triggers correctly update userRoles based on subscription status.
    const hasSubscriberRole = userRoles.includes('subscriber');
    console.log('AuthContext: Subscriber check (role-based):', { roles: userRoles, hasSubscriberRole });
    return hasSubscriberRole;
  }, [userRoles]);

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
    // The onAuthStateChange listener will handle the session and user state updates.
    return supabase.auth.signInWithPassword({
      email,
      password,
    });
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
  }, [session, loading]); // `isSubscriber` and `isAffiliate` (the functions) are stable due to useCallback with userRoles dependency

  const refreshAffiliateApplicationStatus = useCallback(async () => {
    if (!user || !session) {
      setAffiliateApplicationStatus('unknown');
      return;
    }

    if (!isSubscriber()) { // Use the AuthContext's isSubscriber method
      setAffiliateApplicationStatus('not_eligible_not_subscriber');
      return;
    }

    if (isAffiliate()) { // Use the AuthContext's isAffiliate method
      setAffiliateApplicationStatus('not_applicable_is_affiliate');
      return;
    }

    try {
      // Check existing application first
      const { data: existingApp, error: appCheckError } = await supabase
        .from('affiliate_applications')
        .select('status')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (appCheckError) {
        console.error('Error checking existing affiliate application:', appCheckError);
        setAffiliateApplicationStatus('unknown'); // Or some error status
        return;
      }

      if (existingApp) {
        if (existingApp.status === 'pending') {
          setAffiliateApplicationStatus('pending');
          return;
        }
        if (existingApp.status === 'approved') {
          // This case implies they should also have 'affiliate' role. If not, there's a discrepancy.
          // isAffiliate() check above should catch this.
          setAffiliateApplicationStatus('approved');
          return;
        }
        if (existingApp.status === 'rejected') {
          // If rejected, can they reapply? For now, assume 'eligible' if other conditions met.
          // The can_apply_for_affiliate SQL function's logic is what truly matters for re-application.
          // Let's call the RPC to be sure.
        }
      }

      // Call the RPC function `can_apply_for_affiliate`
      const { data: canApply, error: rpcError } = await supabase.rpc('can_apply_for_affiliate', {
        user_id_param: user.id,
      });

      if (rpcError) {
        console.error('Error calling can_apply_for_affiliate RPC:', rpcError);
        setAffiliateApplicationStatus('unknown'); // Or some error status
        return;
      }

      if (canApply) {
        setAffiliateApplicationStatus('eligible');
      } else {
        // If canApply is false, it means one of the conditions in the SQL function failed.
        // We've already checked for subscriber and affiliate status.
        // So, this likely means an application exists that is 'pending' or 'approved'.
        // The existingApp check above should have caught this. If existingApp was null but canApply is false,
        // it's a bit of a contradiction unless the SQL function has slightly different logic not covered by the above checks.
        // For safety, if canApply is false and we haven't set 'pending' or 'approved',
        // we might infer 'pending' or 'approved' if an application exists, otherwise 'eligible' seems unlikely.
        // The most robust way is to rely on the RPC result primarily for 'eligible'.
        // If it's not 'eligible', and we already handled 'not_subscriber' and 'is_affiliate',
        // and an existing app was not 'pending' or 'approved', it might be 'rejected' but still blocking re-application.
        // The SQL function currently blocks if status is 'pending' or 'approved'.
        // If it's 'rejected', the SQL function would allow re-application if not for other reasons.
        // So if canApply is false, and we are here, it must be due to an existing pending/approved application.
        // Let's re-check existingApp as the SQL function does.
         if (existingApp?.status === 'pending') setAffiliateApplicationStatus('pending');
         else if (existingApp?.status === 'approved') setAffiliateApplicationStatus('approved');
         else setAffiliateApplicationStatus('unknown'); // Fallback, should ideally be more specific
      }
    } catch (error) {
      console.error('Error in refreshAffiliateApplicationStatus:', error);
      setAffiliateApplicationStatus('unknown');
    }
  }, [user, session, supabase, isSubscriber, isAffiliate]); // Add supabase, isSubscriber, isAffiliate

  useEffect(() => {
    if (user && session && (userRoles.includes('subscriber') || userRoles.includes('voter'))) {
      // Refresh when user/session changes, or if roles indicate they might be eligible or become eligible.
      refreshAffiliateApplicationStatus();
    }
  }, [user, session, userRoles, refreshAffiliateApplicationStatus]);


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
    isAffiliate,
    affiliateApplicationStatus,
    refreshAffiliateApplicationStatus,
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
