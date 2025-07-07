
import React, { createContext, useState, useEffect, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';

interface ExtendedUser extends User {
  name?: string;
  avatar?: string;
  credits?: number;
  subscription?: string;
}

interface AuthContextType {
  user: ExtendedUser | null;
  session: Session | null;
  userRoles: string[];
  loading: boolean;
  login: (email: string, password: string) => Promise<{ data: any; error: any }>;
  register: (name: string, email: string, password: string, referralCode?: string | null) => Promise<boolean>;
  logout: () => Promise<{ error: any }>;
  isAdmin: () => boolean;
  isSuperAdmin: () => boolean;
  isSubscriber: () => boolean;
  isVoter: () => boolean;
  isAffiliate: () => boolean;
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
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error(`Error fetching user data for ID ${userId}:`, error.message);
        return null;
      }
      
      if (!data) {
        console.warn(`No profile data returned for user ID ${userId}.`);
        return null;
      }
      
      // Get the auth user for email
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      console.log("AuthContext: Profile data:", { id: data.id, username: data.username, full_name: data.full_name });
      
      return {
        id: data.id,
        email: authUser?.email || data.username || '',
        name: data.full_name || data.username || '',
        avatar: data.avatar_url,
        credits: data.credits || 0,
        subscription: 'free',
      } as ExtendedUser;
    } catch (error: any) {
      console.error('Exception in fetchUserData:', error.message);
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

  const handleUserSession = async (authUser: User): Promise<void> => {
    try {
      console.log("AuthContext: handleUserSession called for user:", authUser.id, "email:", authUser.email);
      
      const userData = await fetchUserData(authUser.id);
      if (userData) {
        const roles = await fetchUserRoles(authUser.id);
        setUser(userData);
        setUserRoles(roles);
        console.log("AuthContext: User data and roles set", { 
          userData: { id: userData.id, email: userData.email }, 
          roles 
        });
      } else {
        console.error(`User profile not found for ID: ${authUser.id}`);
        setUser(null);
        setUserRoles([]);
      }
    } catch (error) {
      console.error('Error in handleUserSession:', error);
      setUser(null);
      setUserRoles([]);
    }
  };

  // Simplified useEffect for auth state management
  useEffect(() => {
    console.log("AuthContext: Initializing auth state");
    
    let mounted = true;

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (!mounted) return;

        console.log(`AuthContext: Auth state change event: ${event}`, currentSession?.user?.id || 'No user');

        try {
          if (currentSession?.user) {
            setSession(currentSession);
            await handleUserSession(currentSession.user);
          } else {
            console.log("AuthContext: No session, clearing user state");
            setUser(null);
            setSession(null);
            setUserRoles([]);
          }
        } catch (error: any) {
          console.error(`AuthContext: Error processing auth event ${event}:`, error.message);
          setUser(null);
          setSession(null);
          setUserRoles([]);
        } finally {
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
          setLoading(false);
          return;
        }

        if (currentSession?.user && mounted) {
          console.log("AuthContext: Initial session found");
          setSession(currentSession);
          await handleUserSession(currentSession.user);
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
        await handleUserSession(currentAuthUser);
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

  const register = async (name: string, email: string, password: string, referralCode?: string | null): Promise<boolean> => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: name,
            referral_code: referralCode
          }
        }
      });

      if (error) {
        console.error('Registration error:', error);
        return false;
      }

      return !!data.user;
    } catch (error) {
      console.error('Registration error:', error);
      return false;
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

  const isAffiliate = () => {
    return userRoles.includes('affiliate');
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
    isAffiliate,
    hasRole,
    hasAdminPermission,
    updateUserCredits,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
