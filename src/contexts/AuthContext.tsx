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

  // Modified handleUserSession to return a boolean indicating success
  const handleUserSession = async (authUser: User): Promise<boolean> => {
    try {
      console.log("AuthContext: handleUserSession called for user:", authUser.id, "email:", authUser.email);
      const userData = await fetchUserData(authUser.id);
      if (userData) {
        const roles = await fetchUserRoles(authUser.id);
        setUser(userData); // State update for next render
        setUserRoles(roles);  // State update for next render
        console.log("AuthContext: User data and roles set", { userData: { id: userData.id, email: userData.email }, roles });
        return true; // Indicate success
      } else {
        console.error(`User profile not found for ID: ${authUser.id}. Invalid application state.`);
        setUser(null);
        setSession(null); // Clear session if user data is invalid
        setUserRoles([]);
        return false; // Indicate failure
      }
    } catch (error) {
      console.error('Error in handleUserSession:', error);
      setUser(null);
      setSession(null); // Clear session on error too
      setUserRoles([]);
      return false; // Indicate failure
    }
  };

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
      console.log("AuthContext: Auth user email:", authUser?.email);
      
      return {
        id: data.id,
        email: authUser?.email || data.username || '',
        name: data.full_name || data.username || '',
        avatar: data.avatar_url,
        credits: data.credits || 0,
        subscription: 'free', // Default value since subscription is in separate table
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

  // Main useEffect with improved loading state management
  useEffect(() => {
    console.log("AuthContext: Main useEffect starting.");
    let mounted = true;
    setLoading(true); // Set loading true at the very start

    const LOADING_TIMEOUT_MS = 20000; // 20 seconds
    let loadingTimeoutId: NodeJS.Timeout | null = null;

    const finishLoading = () => {
      if (loadingTimeoutId) { // Clear timeout first
        clearTimeout(loadingTimeoutId);
        loadingTimeoutId = null;
      }
      // Check current loading state before setting, to avoid redundant calls or if unmounted
      if (mounted && loading) {
        setLoading(false);
        console.log("AuthContext: Loading state set to false by finishLoading().");
      } else if (mounted && !loading) {
        console.log("AuthContext: finishLoading() called, but loading state already false.");
      }
    };

    loadingTimeoutId = setTimeout(() => {
      console.warn(`AuthContext: Initialization timeout after ${LOADING_TIMEOUT_MS / 1000}s. Forcing loading to false.`);
      finishLoading(); // Force finish loading
    }, LOADING_TIMEOUT_MS);

    const initialize = async () => {
      try {
        console.log("AuthContext: Getting initial session...");
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();

        if (!mounted) {
          console.log("AuthContext: Component unmounted during initialization, clearing timeout.");
          // Ensure timeout is cleared if component unmounts during initialize
          if (loadingTimeoutId) clearTimeout(loadingTimeoutId);
          return;
        }

        if (sessionError) {
          console.error('AuthContext: Error fetching initial session:', sessionError.message);
          setUser(null); setSession(null); setUserRoles([]);
          finishLoading(); // Error case for initialization, call finishLoading
          return;
        }

        if (currentSession?.user) {
          console.log("AuthContext: Initial session found. User:", currentSession.user.id, ". Deferring to onAuthStateChange to finish loading.");
          setSession(currentSession);
          // IMPORTANT: We await handleUserSession here. If it completes and onAuthStateChange
          // for INITIAL_USER_SESSION (or equivalent) doesn't call finishLoading,
          // the timeout is the only backstop. The onAuthStateChange.finally block is key.
          await handleUserSession(currentSession.user);
          // It's expected that onAuthStateChange will fire for an existing session and its finally block will call finishLoading.
        } else {
          console.log("AuthContext: No initial session found during init. Calling finishLoading.");
          setUser(null); setSession(null); setUserRoles([]);
          finishLoading(); // No session from init, so finish loading.
        }
      } catch (error: any) {
        console.error('AuthContext: Error during initialize function:', error.message);
        if (mounted) {
          setUser(null); setSession(null); setUserRoles([]);
        }
        finishLoading(); // Finish loading on any error during init function itself
      }
      // No 'finally' block for initialize() that calls finishLoading.
      // It's handled by specific paths within initialize() or by onAuthStateChange / timeout.
    };

    initialize();

    // Set up auth state listener
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (!mounted) {
          console.log("AuthContext: Auth state change received but component unmounted.");
          return;
        }

        console.log(`AuthContext: Auth state change event: ${event}`, currentSession?.user?.id || 'No user');

        // No setLoading(true) here; initial true is set at useEffect start.
        // finishLoading() in the finally block handles setting it to false.

        try {
          if (event === 'SIGNED_IN' && currentSession?.user) {
            console.log("AuthContext: SIGNED_IN: Setting session and processing user.");
            setSession(currentSession);
            await handleUserSession(currentSession.user);
          } else if (event === 'SIGNED_OUT') {
            console.log("AuthContext: SIGNED_OUT: Clearing user, session, roles.");
            setUser(null);
            setSession(null);
            setUserRoles([]);
          } else if (event === 'TOKEN_REFRESHED' && currentSession?.user) {
            console.log("AuthContext: TOKEN_REFRESHED: Updating session and user.");
            setSession(currentSession);
            await handleUserSession(currentSession.user);
          } else if (event === 'INITIAL_SESSION' && currentSession?.user) {
            // Supabase v2 might fire INITIAL_SESSION. Treat like SIGNED_IN.
            console.log("AuthContext: INITIAL_SESSION: Setting session and processing user.");
            setSession(currentSession);
            await handleUserSession(currentSession.user);
          }
          // Other events (USER_UPDATED, PASSWORD_RECOVERY) can be handled if they affect auth state significantly.
        } catch (error: any) {
          console.error(`AuthContext: Error processing auth event ${event}:`, error.message);
          if (mounted) {
            setUser(null);
            setSession(null);
            setUserRoles([]);
          }
        } finally {
          // This 'finally' block is crucial. It ensures that after any event is processed (or fails),
          // we attempt to finish the loading sequence.
          if (mounted) {
            console.log(`AuthContext: Auth event '${event}' processing complete. Calling finishLoading().`);
            finishLoading();
          }
        }
      }
    );

    return () => {
      console.log("AuthContext: Cleanup - unsubscribing from auth listener and clearing timeout.");
      mounted = false;
      if (authListener?.subscription) {
        authListener.subscription.unsubscribe();
      }
      if (loadingTimeoutId) { // Ensure timeout is cleared on unmount
        clearTimeout(loadingTimeoutId);
        loadingTimeoutId = null;
      }
    };
  }, []); // Empty dependency array: runs once on mount and cleans up on unmount

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
      } else {
        console.error("AuthContext: Could not get current auth user after role sync. State might be stale.");
        if(user?.id === userId) await handleUserSession(user);
      }
    } catch (error: any) {
      console.error('AuthContext: Exception during syncSubscriptionRole:', error.message);
    }
  };

  useEffect(() => {
    let refreshInterval: NodeJS.Timeout;
    const FIVE_MINUTES_IN_MS = 5 * 60 * 1000;
    const REFRESH_THRESHOLD_SECONDS = 5 * 60;

    const attemptSessionRefresh = async () => {
      try {
        const { data: { session: currentAuthSession }, error: getSessionError } = await supabase.auth.getSession();
        if (getSessionError) {
          console.error('AuthContext: Error getting session during periodic refresh:', getSessionError.message);
          return;
        }
        if (!currentAuthSession) {
          console.log('AuthContext: No session found during periodic refresh (user might have logged out).');
          return;
        }

        const now = Math.floor(Date.now() / 1000);
        const expiresAt = currentAuthSession.expires_at;

        if (expiresAt && (expiresAt - now < REFRESH_THRESHOLD_SECONDS)) {
          console.log('AuthContext: Session token expires soon. Attempting proactive refresh.');
          const { error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError) {
            console.error('AuthContext: Proactive token refresh failed:', refreshError.message);
          } else {
            console.log('AuthContext: Session token refreshed proactively.');
          }
        }
      } catch (error: any) {
        console.error('AuthContext: Exception in attemptSessionRefresh:', error.message);
      }
    };

    if (user && session) {
      console.log("AuthContext: User is logged in. Starting session refresh interval.");
      refreshInterval = setInterval(attemptSessionRefresh, FIVE_MINUTES_IN_MS);
    } else {
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
  }, [user, session]);

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
