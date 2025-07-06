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
  const [loading, setLoading] = useState(true); // Initialize loading to true
  const navigate = useNavigate();
  const location = useLocation();

  // Modified handleUserSession: Does NOT manage loading state.
  // Sets user to null if profile data is missing.
  const handleUserSession = async (authUser: User) => {
    try {
      // authUser is from a valid Supabase session.
      // The session state in AuthContext should already be set by the caller (initializeSession or onAuthStateChange).
      // This function's job is to fetch app-specific user details (profile, roles).
      const userData = await fetchUserData(authUser.id);
      // Only attempt to fetch roles if we successfully got user data.
      const roles = userData ? await fetchUserRoles(authUser.id) : [];

      if (userData) {
        setUser(userData);
        setUserRoles(roles);
        // Session remains as set by the caller, reflecting the valid Supabase session.
      } else {
        // Failed to fetch app-specific user profile data.
        // This could be due to a missing profile or a temporary network error.
        // The user is authenticated with Supabase, but cannot fully use the app without this data.
        console.warn(`App user profile data not found or failed to fetch for authenticated user ID: ${authUser.id}. Setting app user to null.`);
        setUser(null); // Clear app-level user object
        setUserRoles([]); // Clear app-level roles
        // The Supabase session (stored in AuthContext's session state) remains.
        // ProtectedRoute will likely redirect to login if user is null, which is an acceptable outcome.
      }
    } catch (error) {
      // Catch any unexpected errors during fetchUserData/fetchUserRoles
      console.error('Exception in handleUserSession while fetching profile/roles:', error);
      setUser(null); // Clear app-level user object
      setUserRoles([]); // Clear app-level roles
      // The Supabase session (stored in AuthContext's session state) remains.
    }
  };

  // fetchUserData: Improved error logging and returns null on failure.
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
      return {
        id: data.id,
        email: data.username || (user?.email || ''), // Use current user's email as fallback
        name: data.full_name || data.username || '',
        avatar: data.avatar_url,
        credits: data.credits || 0,
        subscription: data.subscription_status || 'free', // Assuming 'subscription_status' field
      } as ExtendedUser;
    } catch (error: any) {
      console.error('Exception in fetchUserData:', error.message);
      return null;
    }
  };

  // fetchUserRoles: Improved error logging and returns empty array on failure.
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
      return data ? data.map(item => item.role) : [];
    } catch (error: any) {
      console.error('Exception in fetchUserRoles:', error.message);
      return [];
    }
  };

  // Main useEffect for auth initialization and state changes
  useEffect(() => {
    console.log("AuthContext: Main useEffect starting. Setting loading to true.");
    setLoading(true);
    let mounted = true;

    const initializeSession = async () => {
      console.log("AuthContext: initializeSession called.");
      try {
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();

        if (!mounted) return;

        if (sessionError) {
          console.error('AuthContext: Error fetching initial session:', sessionError.message);
          setUser(null);
          setSession(null);
          setUserRoles([]);
          return;
        }

        if (currentSession?.user) {
          console.log("AuthContext: Initial session found, user:", currentSession.user.id);
          setSession(currentSession);
          await handleUserSession(currentSession.user);
        } else {
          console.log("AuthContext: No active initial session found.");
          setUser(null);
          setSession(null);
          setUserRoles([]);
        }
      } catch (error: any) {
        console.error('AuthContext: Error during session initialization:', error.message);
        if (mounted) {
          setUser(null);
          setSession(null);
          setUserRoles([]);
        }
      } finally {
        if (mounted) {
          console.log("AuthContext: initializeSession finally block, setting loading to false.");
          setLoading(false);
        }
      }
    };

    initializeSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (!mounted) {
          console.log("AuthContext: onAuthStateChange received event but component unmounted.");
          return;
        }

        console.log(`AuthContext: onAuthStateChange event: ${event}`, currentSession?.user?.id || 'No user');
        setLoading(true);

        try {
          if (event === 'INITIAL_SESSION') {
            // This event is often handled by initializeSession already or might be redundant.
            // If initializeSession handles it, this path might just confirm.
            // If currentSession exists here, it means initializeSession might not have caught it or this is a subsequent INITIAL_SESSION event.
            console.log("AuthContext: Event INITIAL_SESSION received.");
            if (currentSession?.user) {
              setSession(currentSession);
              await handleUserSession(currentSession.user);
            } else {
              setUser(null);
              setSession(null);
              setUserRoles([]);
            }
          } else if (event === 'SIGNED_IN' && currentSession?.user) {
            console.log("AuthContext: Event SIGNED_IN, user:", currentSession.user.id);
            setSession(currentSession);
            await handleUserSession(currentSession.user);
          } else if (event === 'SIGNED_OUT') {
            console.log("AuthContext: Event SIGNED_OUT.");
            setUser(null);
            setSession(null);
            setUserRoles([]);
          } else if (event === 'TOKEN_REFRESHED' && currentSession?.user) {
            console.log("AuthContext: Event TOKEN_REFRESHED, user:", currentSession.user.id);
            setSession(currentSession);
            // User data might not change with token refresh, but roles or other profile aspects could.
            // Re-running handleUserSession ensures consistency.
            await handleUserSession(currentSession.user);
          } else if (event === 'USER_UPDATED' && currentSession?.user) {
            console.log("AuthContext: Event USER_UPDATED, user:", currentSession.user.id);
            // User's auth information (e.g. email) might have been updated.
            await handleUserSession(currentSession.user); // Refresh app's user profile
          } else if (event === 'PASSWORD_RECOVERY') {
             console.log("AuthContext: Event PASSWORD_RECOVERY. User needs to complete action.");
            // No immediate session change, usually. Loading is true, then false.
            // User might be redirected or needs to input new password.
          }
          // Other events like MFA_CHALLENGE can be added here.
        } catch (error: any) {
          console.error(`AuthContext: Error processing auth event ${event}:`, error.message);
          if (mounted) {
            setUser(null);
            setSession(null);
            setUserRoles([]);
          }
        } finally {
          if (mounted) {
            console.log(`AuthContext: onAuthStateChange finally block for event ${event}, setting loading to false.`);
            setLoading(false);
          }
        }
      }
    );

    return () => {
      console.log("AuthContext: Main useEffect cleanup. Unsubscribing auth listener.");
      mounted = false;
      if (authListener && typeof authListener.unsubscribe === 'function') {
        authListener.unsubscribe();
      }
    };
  }, []); // Empty dependency array: runs once on mount, cleans up on unmount.

  // useEffect for handling subscription success from URL parameters
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('subscription') === 'success' && user?.id) {
      console.log('AuthContext: Subscription success URL param detected. Syncing roles for user:', user.id);
      syncSubscriptionRole(user.id);
      // The page (e.g., ProtectedRoute or specific success page) should clear these URL params
      // to prevent re-triggering this effect unnecessarily.
    }
  }, [location.search, user?.id]); // Dependencies: location.search and user.id

  const syncSubscriptionRole = async (userId: string) => {
    console.log('AuthContext: Invoking sync-subscription-role Supabase function for user:', userId);
    // This function could have its own specific loading state if it's a long operation.
    // For now, it doesn't alter the main 'loading' state of AuthContext.
    try {
      const { error } = await supabase.functions.invoke('sync-subscription-role', {
        body: { user_id: userId },
      });
      if (error) {
        console.error('AuthContext: Error syncing subscription role via function:', error.message);
        return;
      }
      console.log('AuthContext: sync-subscription-role function completed. Refreshing user data.');
      // After role sync, refresh user data to reflect changes (e.g., new roles).
      // Get the latest user from Supabase auth to pass to handleUserSession.
      const { data: { user: currentAuthUser } } = await supabase.auth.getUser();
      if (currentAuthUser) {
        await handleUserSession(currentAuthUser); // This will update user & roles states
      } else {
        console.error("AuthContext: Could not get current auth user after role sync. State might be stale.");
        // As a fallback, if user object in state has ID, try with that.
        if(user?.id === userId) await handleUserSession(user);
      }
    } catch (error: any) {
      console.error('AuthContext: Exception during syncSubscriptionRole:', error.message);
    }
  };

  // useEffect for periodic session refresh
  useEffect(() => {
    let refreshInterval: NodeJS.Timeout;
    const FIVE_MINUTES_IN_MS = 5 * 60 * 1000; // 300000
    const REFRESH_THRESHOLD_SECONDS = 5 * 60; // Refresh if token expires within 5 minutes

    const attemptSessionRefresh = async () => {
      try {
        const { data: { session: currentAuthSession }, error: getSessionError } = await supabase.auth.getSession();
        if (getSessionError) {
          console.error('AuthContext: Error getting session during periodic refresh:', getSessionError.message);
          return;
        }
        if (!currentAuthSession) {
          console.log('AuthContext: No session found during periodic refresh (user might have logged out).');
          // onAuthStateChange should handle SIGNED_OUT if logout occurred.
          return;
        }

        const now = Math.floor(Date.now() / 1000);
        const expiresAt = currentAuthSession.expires_at;

        if (expiresAt && (expiresAt - now < REFRESH_THRESHOLD_SECONDS)) {
          console.log('AuthContext: Session token expires soon. Attempting proactive refresh.');
          const { error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError) {
            console.error('AuthContext: Proactive token refresh failed:', refreshError.message);
            // If refresh fails, onAuthStateChange might eventually trigger SIGNED_OUT.
          } else {
            console.log('AuthContext: Session token refreshed proactively.');
          }
        }
      } catch (error: any) {
        console.error('AuthContext: Exception in attemptSessionRefresh:', error.message);
      }
    };

    if (user && session) { // Only run the interval if user is logged in
      console.log("AuthContext: User is logged in. Starting session refresh interval.");
      refreshInterval = setInterval(attemptSessionRefresh, FIVE_MINUTES_IN_MS);
    } else {
      // Clear interval if user logs out or session becomes null
      if (refreshInterval) {
        console.log("AuthContext: User not logged in or no session. Clearing session refresh interval.");
        clearInterval(refreshInterval);
      }
    }

    return () => {
      if (refreshInterval) {
        console.log("AuthContext: Clearing session refresh interval due to unmount or user/session change.");
        clearInterval(refreshInterval);
      }
    };
  }, [user, session]); // Dependencies: user and session state

  // Login, Register, Logout functions are simplified:
  // They initiate Supabase auth actions.
  // onAuthStateChange will handle state updates (user, session, roles, loading).

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

      // Update local user state
      setUser(prev => prev ? { ...prev, credits: data } : null);
    } catch (error) {
      console.error('Error updating credits:', error);
      throw error;
    }
  };

  const isAdmin = () => {
    return userRoles.includes('admin');
  };

  const isSuperAdmin = () => {
    return userRoles.includes('super_admin');
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
