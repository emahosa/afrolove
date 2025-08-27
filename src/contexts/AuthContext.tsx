
import React, { createContext, useState, useEffect, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';

interface SubscriptionInfo {
  planId: string | null;
  status: string | null;
  expiresAt: string | null;
}

interface ExtendedUser extends User {
  name?: string;
  avatar?: string;
  credits?: number;
  subscription?: SubscriptionInfo | null;
}

interface AuthContextType {
  user: ExtendedUser | null;
  session: Session | null;
  userRoles: string[];
  loading: boolean;
  login: (email: string, password: string) => Promise<{ data: any; error: any }>;
  register: (name: string, email: string, password: string, referralCode?: string | null, deviceId?: string) => Promise<boolean>;
  logout: () => Promise<{ error: any }>;
  isAdmin: () => boolean;
  isSuperAdmin: () => boolean;
  isSubscriber: () => boolean;
  isVoter: () => boolean;
  hasRole: (role: string) => boolean;
  hasAdminPermission: (permission: string) => boolean;
  updateUserCredits: (amount: number) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<ExtendedUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const fetchUserData = async (userId: string): Promise<ExtendedUser | null> => {
    try {
      console.log('AuthContext: Fetching user data for:', userId);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error(`Error fetching user data for ID ${userId}:`, error.message);
        
        // If no profile exists, create one from auth user data
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser && authUser.id === userId) {
          console.log('AuthContext: Creating profile from auth user data');
          
          const profileData = {
            id: authUser.id,
            username: authUser.email,
            full_name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || '',
            avatar_url: authUser.user_metadata?.avatar_url || '',
            credits: 5
          };

          const { error: insertError } = await supabase
            .from('profiles')
            .insert(profileData);

          if (!insertError) {
            return {
              id: authUser.id,
              email: authUser.email || '',
              name: profileData.full_name,
              avatar: profileData.avatar_url,
              credits: profileData.credits,
              subscription: null,
            } as ExtendedUser;
          }
        }
        return null;
      }
      
      if (!data) {
        console.warn(`No profile data returned for user ID ${userId}.`);
        return null;
      }
      
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      console.log("AuthContext: Profile data:", { id: data.id, username: data.username, full_name: data.full_name });

      let subscriptionInfo: SubscriptionInfo | null = null;
      
      try {
        // Fixed query - remove .single() and handle array properly
        const { data: subData, error: subError } = await supabase
          .from('user_subscriptions')
          .select('subscription_type, subscription_status, expires_at')
          .eq('user_id', userId)
          .eq('subscription_status', 'active')
          .order('created_at', { ascending: false });

        if (subError) {
          console.error(`Error fetching user subscription for ID ${userId}:`, subError.message);
        } else if (subData && subData.length > 0) {
          const subscription = subData[0];
          subscriptionInfo = {
            planId: subscription.subscription_type,
            status: subscription.subscription_status,
            expiresAt: subscription.expires_at,
          };
          console.log(`AuthContext: Active subscription found for user ${userId}:`, subscriptionInfo);
        } else {
          console.log(`AuthContext: No active subscription found for user ${userId}`);
        }
      } catch (subFetchError: any) {
        console.error('Exception in fetchUserData while fetching subscription:', subFetchError.message);
      }
      
      return {
        id: data.id,
        email: authUser?.email || data.username || '',
        name: data.full_name || data.username || '',
        avatar: data.avatar_url,
        credits: data.credits || 0,
        subscription: subscriptionInfo,
        user_metadata: authUser?.user_metadata
      } as ExtendedUser;
    } catch (error: any) {
      console.error('Exception in fetchUserData (profile fetch):', error.message);
      return null;
    }
  };

  const fetchUserRoles = async (userId: string): Promise<string[]> => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (error) {
        console.error(`Error fetching user roles for ID ${userId}:`, error.message);
        return [];
      }
      
      console.log("AuthContext: User roles fetched:", data?.map(item => item.role) || []);
      return data ? data.map(item => item.role) : [];
    } catch (error: any) {
      console.error('Exception in fetchUserRoles:', error.message);
      return [];
    }
  };

  // Initialize auth state
  useEffect(() => {
    console.log("AuthContext: Initializing auth state");
    
    let mounted = true;

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (!mounted) return;

        console.log(`AuthContext: Auth state change event: ${event}`, currentSession?.user?.id || 'No user');

        setSession(currentSession);
        
        if (currentSession?.user) {
          // Defer user data fetching to prevent callback issues
          setTimeout(async () => {
            if (!mounted) return;
            
            try {
              const userData = await fetchUserData(currentSession.user.id);
              if (userData && mounted) {
                const roles = await fetchUserRoles(currentSession.user.id);
                setUser(userData);
                setUserRoles(roles);
                console.log("AuthContext: User data and roles set", { 
                  userData: { id: userData.id, email: userData.email }, 
                  roles 
                });
              } else {
                console.error(`User profile not found for ID: ${currentSession.user.id}`);
                setUser(null);
                setUserRoles([]);
              }
            } catch (error) {
              console.error('Error fetching user data:', error);
              setUser(null);
              setUserRoles([]);
            } finally {
              if (mounted) {
                setLoading(false);
              }
            }
          }, 0);
        } else {
          console.log("AuthContext: No session, clearing user state");
          setUser(null);
          setUserRoles([]);
          if (mounted) {
            setLoading(false);
          }
        }
      }
    );

    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('AuthContext: Error fetching initial session:', error.message);
          if (mounted) {
            setLoading(false);
          }
          return;
        }

        if (currentSession?.user && mounted) {
          console.log("AuthContext: Initial session found");
          setSession(currentSession);
          
          // Fetch user data
          try {
            const userData = await fetchUserData(currentSession.user.id);
            if (userData && mounted) {
              const roles = await fetchUserRoles(currentSession.user.id);
              setUser(userData);
              setUserRoles(roles);
            }
          } catch (error) {
            console.error('Error fetching initial user data:', error);
          }
        } else {
          console.log("AuthContext: No initial session found");
        }
        
        if (mounted) {
          setLoading(false);
        }
      } catch (error: any) {
        console.error('AuthContext: Error during initialization:', error.message);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    getInitialSession();

    return () => {
      console.log("AuthContext: Cleanup - unsubscribing from auth listener");
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Handle subscription success URL parameter
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('subscription') === 'success' && user?.id) {
      console.log('AuthContext: Subscription success URL param detected. Syncing roles for user:', user.id);
      syncSubscriptionRole(user.id);
    }
  }, [location.search, user?.id]);

  const syncSubscriptionRole = async (userId: string) => {
    console.log('AuthContext: Invoking sync-subscription-role Supabase function for user:', userId);
    try {
      const { error } = await supabase.functions.invoke('sync-subscription-role', {
        body: { user_id: userId },
      });
      
      if (error) {
        console.error('AuthContext: Error syncing subscription role via function:', error.message);
        return;
      }
      
      console.log('AuthContext: sync-subscription-role function completed. Refreshing user data.');
      const { data: { user: currentAuthUser } } = await supabase.auth.getUser();
      if (currentAuthUser) {
        const userData = await fetchUserData(currentAuthUser.id);
        if (userData) {
          const roles = await fetchUserRoles(currentAuthUser.id);
          setUser(userData);
          setUserRoles(roles);
        }
      }
    } catch (error: any) {
      console.error('AuthContext: Exception during syncSubscriptionRole:', error.message);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      return { data, error: null };
    } catch (error: any) {
      console.error('Login error:', error);
      return { data: null, error };
    }
  };

  const register = async (name: string, email: string, password: string, referralCode?: string | null, deviceId?: string): Promise<boolean> => {
    try {
      const redirectUrl = `${window.location.origin}/dashboard`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: name,
            name: name,
            referral_code: referralCode,
            device_id: deviceId
          }
        }
      });

      if (error) {
        console.error('Registration error:', error);
        throw error;
      }

      console.log('Registration successful:', data);
      return !!data.user;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Logout error:', error);
        return { error };
      }
      
      setUser(null);
      setSession(null);
      setUserRoles([]);
      navigate('/login');
      return { error: null };
    } catch (error: any) {
      console.error('Logout error:', error);
      return { error };
    }
  };

  const updateUserCredits = async (amount: number): Promise<void> => {
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

  const isAdmin = () => {
    const hasAdminRole = userRoles.includes('admin');
    console.log("AuthContext: isAdmin check - userRoles:", userRoles, "hasAdminRole:", hasAdminRole);
    return hasAdminRole;
  };

  const isSuperAdmin = () => {
    const hasSuperAdminRole = userRoles.includes('super_admin');
    const isSuperAdminEmail = user?.email === 'ellaadahosa@gmail.com';
    console.log("AuthContext: isSuperAdmin check - userRoles:", userRoles, "hasSuperAdminRole:", hasSuperAdminRole, "isSuperAdminEmail:", isSuperAdminEmail, "userEmail:", user?.email);
    return hasSuperAdminRole || isSuperAdminEmail;
  };

  const isSubscriber = () => {
    return userRoles.includes('subscriber');
  };

  const isVoter = () => {
    return userRoles.includes('voter') && !isSubscriber();
  };

  const hasRole = (role: string) => {
    return userRoles.includes(role);
  };

  const hasAdminPermission = (permission: string) => {
    return isAdmin() || isSuperAdmin();
  };

  const value = {
    user,
    session,
    userRoles,
    loading,
    login,
    register,
    logout,
    isAdmin,
    isSuperAdmin,
    isSubscriber,
    isVoter,
    hasRole,
    hasAdminPermission,
    updateUserCredits,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
