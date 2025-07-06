
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
  const hasRedirected = useRef(false);

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
      
      // Reset redirect flag on logout
      hasRedirected.current = false;
      
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

    // setLoading(false) will be handled by the useEffect watching `session`'s processAndFetch.
    // supabase.auth.getSession().then(({ data }) => {
    //     if (!data.session) {
    //         setLoading(false);
    //     }
    // });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

// --- Start of Revised AuthContext Logic for Admin Loop Fix ---

// const [user, setUser] = useState<ExtendedUser | null>(null); // Already defined
// const [session, setSession] = useState<Session | null>(null); // Already defined
// const [loading, setLoading] = useState(true); // This will be replaced by derived isLoading

const [isAuthCheckLoading, setIsAuthCheckLoading] = useState(true);
const [isUserHydrationPending, setIsUserHydrationPending] = useState(false);
const isLoading = isAuthCheckLoading || isUserHydrationPending; // Derived loading state

// const [userRoles, setUserRoles] = useState<string[]>([]); // Already defined
// const [adminPermissions, setAdminPermissions] = useState<string[]>([]); // Already defined
// const [subscriberStatus, setSubscriberStatus] = useState(false); // Already defined
// const processedUserId = useRef<string | null>(null); // Already defined
// const hasRedirected = useRef(false); // Already defined

useEffect(() => {
  // Initial session check and auth listener setup
  supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
    setSession(initialSession);
    setIsAuthCheckLoading(false);
    if (initialSession) {
      // Check if hydration is needed for this initial session
      // This avoids flicker if user data is already in `user` state from a previous quick load
      if (!user || user.id !== initialSession.user.id) {
         setIsUserHydrationPending(true);
      }
    } else {
      // No initial session, so no user hydration needed. Clear user state if any.
      setUser(null);
      setUserRoles([]);
      setAdminPermissions([]);
      setSubscriberStatus(false);
    }
  });

  const { data: authListener } = supabase.auth.onAuthStateChange(
    (_event, currentSession) => {
      const oldSessionUserId = session?.user?.id;
      setSession(currentSession);
      setIsAuthCheckLoading(false); // An auth event occurred, so initial check phase is done.

      if (currentSession) {
        // If user changed, or if there was no user previously for the current session user
        if (currentSession.user.id !== oldSessionUserId || !user || user.id !== currentSession.user.id) {
          setIsUserHydrationPending(true);
        }
        // If same user and user data is already loaded, isUserHydrationPending might remain false
        // or this event simply confirms the existing session.
      } else {
        // Logged out
        setIsUserHydrationPending(false);
        setUser(null);
        setUserRoles([]);
        setAdminPermissions([]);
        setSubscriberStatus(false);
        // processedUserId.current = null; // Handled by session effect
        // hasRedirected.current = false; // Handled by session effect
      }
    }
  );
  return () => authListener.subscription.unsubscribe();
}, []); // Runs once for setup

useEffect(() => {
  // This effect handles hydrating user data when a session exists AND hydration is pending
  if (session && isUserHydrationPending) {
    const processUserData = async () => {
      try {
        const userId = session.user.id;
        console.log('AuthContext: Hydrating user data for user:', userId);

        const [profileResult, userRoleResult, permissionsResult, isSubscriberRpcResult, userSubscriptionResult] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
          supabase.from('user_roles').select('role').eq('user_id', userId),
          supabase.from('admin_permissions').select('permission').eq('user_id', userId),
          supabase.rpc('is_subscriber', { _user_id: userId }),
          supabase.from('user_subscriptions').select('subscription_type').eq('user_id', userId).eq('subscription_status', 'active').maybeSingle()
        ]);

        const profile = profileResult.data;
        const roles = userRoleResult.data?.map(r => r.role) || ['voter'];
        const permissions = permissionsResult.data?.map(p => p.permission) || [];
        const isActualSubscriber = !!isSubscriberRpcResult.data;

        setUserRoles(roles);
        setAdminPermissions(permissions);
        setSubscriberStatus(isActualSubscriber);

        let subscriptionType: ExtendedUser['subscription'] = 'free';
        if (isActualSubscriber) {
          const subDetails = userSubscriptionResult.data;
          if (subDetails && subDetails.subscription_type) {
            const planId = subDetails.subscription_type.toLowerCase();
            if (planId.includes('premium')) subscriptionType = 'premium';
            else if (planId.includes('professional')) subscriptionType = 'enterprise';
            else if (planId.includes('basic')) subscriptionType = 'premium';
            else subscriptionType = 'premium';
          } else {
            subscriptionType = 'premium';
          }
        }

        const fullUser: ExtendedUser = {
          ...session.user,
          name: profile?.full_name || session.user.user_metadata.full_name || session.user.email?.split('@')[0] || 'User',
          avatar: profile?.avatar_url || session.user.user_metadata.avatar_url || '',
          credits: profile?.credits ?? 5,
          subscription: subscriptionType
        };
        setUser(fullUser);
        processedUserId.current = userId; // Mark this user ID as processed
        console.log('AuthContext: User hydration complete for:', fullUser.name);

        // Admin redirect logic
        const isAdminUser = (fullUser.email === "ellaadahosa@gmail.com" || roles.includes('admin') || roles.includes('super_admin'));
        const currentPath = window.location.pathname;
        const isOnAdminRoute = currentPath.startsWith('/admin');

        if (isAdminUser && !isOnAdminRoute && !hasRedirected.current) {
          console.log('AuthContext: Admin user detected, redirecting to admin panel');
          hasRedirected.current = true;
          setTimeout(() => { window.location.href = '/admin'; }, 100);
        }
        setIsUserHydrationPending(false); // Hydration successful
      } catch (error) {
        console.error('AuthContext: Error hydrating user data:', error);
        setUser(null);
        setUserRoles([]);
        setAdminPermissions([]);
        setSubscriberStatus(false);
        // processedUserId.current remains to avoid quick re-fetch if session is still same
        setIsUserHydrationPending(false); // Stop trying if hydration failed
      }
    };
    processUserData();
  } else if (!session) {
    // If session becomes null, ensure user state is also null and hydration is not pending.
    // This is also partly handled by onAuthStateChange, but good to be defensive.
    setUser(null);
    setUserRoles([]);
    setAdminPermissions([]);
    setSubscriberStatus(false);
    processedUserId.current = null;
    hasRedirected.current = false;
    setIsUserHydrationPending(false); // No session, so no hydration pending
  }
  // If session exists but isUserHydrationPending is false, means data is already loaded.
}, [session, isUserHydrationPending, user]); // Added `user` to dep array for the initial check in getSession().then()
                                          // and in onAuthStateChange for !user comparison.

// --- End of Revised AuthContext Logic ---


  const value = {
    user,
    session,
    loading: isLoading, // Use the derived isLoading state
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
