import React, { createContext, useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  userRoles: string[];
  loading: boolean;
  login: (email: string, password: string) => Promise<{ data: any; error: any }>;
  logout: () => Promise<{ error: any }>;
  isAdmin: () => boolean;
  isSuperAdmin: () => boolean;
  isSubscriber: () => boolean;
  isVoter: () => boolean;
  hasRole: (role: string) => boolean;
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
  const [user, setUser] = useState<User | null>(null);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Session refresh interval
  useEffect(() => {
    let refreshInterval: NodeJS.Timeout;

    const startSessionRefresh = () => {
      refreshInterval = setInterval(async () => {
        try {
          const { data: { session }, error } = await supabase.auth.getSession();
          if (error) {
            console.error('Session refresh error:', error);
            return;
          }
          
          if (!session) {
            console.log('No session found, user may have logged out');
            return;
          }

          // Refresh the session if it's close to expiry (within 5 minutes)
          const now = Math.floor(Date.now() / 1000);
          const expiresAt = session.expires_at || 0;
          
          if (expiresAt - now < 300) { // 5 minutes
            const { error: refreshError } = await supabase.auth.refreshSession();
            if (refreshError) {
              console.error('Token refresh error:', refreshError);
            }
          }
        } catch (error) {
          console.error('Session refresh interval error:', error);
        }
      }, 300000); // Check every 5 minutes
    };

    if (user) {
      startSessionRefresh();
    }

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [user]);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session error:', error);
          if (mounted) {
            setLoading(false);
          }
          return;
        }

        if (session?.user && mounted) {
          await handleUserSession(session.user);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        console.log('Auth state changed:', event);
        
        if (event === 'SIGNED_IN' && session?.user) {
          await handleUserSession(session.user);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setUserRoles([]);
          // Don't redirect here to prevent unwanted redirects
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          // Update user data but don't trigger full re-auth
          const updatedUser = await fetchUserData(session.user.id);
          if (updatedUser && mounted) {
            setUser(updatedUser);
          }
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleUserSession = async (authUser: any) => {
    try {
      const userData = await fetchUserData(authUser.id);
      if (userData) {
        setUser(userData);
        const roles = await fetchUserRoles(authUser.id);
        setUserRoles(roles);
      }
    } catch (error) {
      console.error('Error handling user session:', error);
    }
  };

  const fetchUserData = async (userId: string): Promise<User | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user data:', error);
        return null;
      }

      return {
        id: userId,
        email: data.username || '',
        name: data.full_name || data.username || '',
        avatar_url: data.avatar_url,
        credits: data.credits || 0
      };
    } catch (error) {
      console.error('Error in fetchUserData:', error);
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
        console.error('Error fetching user roles:', error);
        return [];
      }

      return data.map(item => item.role);
    } catch (error) {
      console.error('Error in fetchUserRoles:', error);
      return [];
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

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Logout error:', error);
        return { error };
      }
      
      setUser(null);
      setUserRoles([]);
      navigate('/login');
      return { error: null };
    } catch (error: any) {
      console.error('Logout error:', error);
      return { error };
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

  const hasRole = (role: string) => {
    return userRoles.includes(role);
  };

  const value = {
    user,
    userRoles,
    loading,
    login,
    logout,
    isAdmin,
    isSuperAdmin,
    isSubscriber,
    isVoter,
    hasRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
