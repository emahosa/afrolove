
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ExtendedUser extends User {
  name?: string;
  avatar?: string;
  credits?: number;
  subscription?: 'free' | 'premium' | 'enterprise';
}

interface AuthContextType {
  user: ExtendedUser | null;
  session: Session | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (fullName: string, email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isAdmin: () => boolean;
  userRoles: string[];
  updateUserCredits: (amount: number) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<ExtendedUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const initialized = useRef(false);

  const isAdmin = () => {
    if (user?.email === 'ellaadahosa@gmail.com') {
      return true;
    }
    return userRoles.includes('admin');
  };

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

  const fetchUserRoles = async (userId: string) => {
    try {
      // Use the new security definer function instead of direct query
      const { data, error } = await supabase.rpc('get_user_role', { 
        user_id_param: userId 
      });
      
      if (error) {
        console.error('AuthContext: Error fetching roles:', error);
        return ['user'];
      }
      
      const roles = data ? [data] : ['user'];
      console.log('AuthContext: Fetched roles:', roles);
      return roles;
    } catch (error) {
      console.error('AuthContext: Error in fetchUserRoles:', error);
      return ['user'];
    }
  };

  const processSession = async (session: Session | null) => {
    console.log('AuthContext: Processing session:', session ? 'exists' : 'null');
    
    try {
      if (session?.user) {
        // Get basic profile data
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();
        
        let basicUser: ExtendedUser;
        
        if (profile && !profileError) {
          basicUser = {
            ...session.user,
            name: profile.full_name || session.user.user_metadata.full_name || 'User',
            avatar: profile.avatar_url || session.user.user_metadata.avatar_url || '',
            credits: profile.credits || 0,
            subscription: 'free'
          };
        } else {
          basicUser = {
            ...session.user,
            name: session.user.user_metadata.full_name || session.user.email?.split('@')[0] || 'User',
            avatar: session.user.user_metadata.avatar_url || '',
            credits: 5,
            subscription: 'free'
          };
        }
        
        setUser(basicUser);
        setSession(session);
        
        // Fetch roles using the new function
        const roles = await fetchUserRoles(session.user.id);
        setUserRoles(roles);
        
        console.log('AuthContext: User setup complete for:', basicUser.name);
      } else {
        setUser(null);
        setUserRoles([]);
        setSession(null);
      }
    } catch (error) {
      console.error('AuthContext: Error processing session:', error);
      setUser(null);
      setUserRoles([]);
      setSession(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      console.log('AuthContext: Attempting login for:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('AuthContext: Login error:', error);
        throw error;
      }

      if (data.user) {
        console.log('AuthContext: Login successful for:', data.user.id);
        return true;
      }
      return false;
    } catch (error: any) {
      console.error('Login error:', error);
      throw error;
    }
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
        throw error;
      }
      setUser(null);
      setSession(null);
      setUserRoles([]);
      initialized.current = false;
    } catch (error: any) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  useEffect(() => {
    console.log('AuthContext: Initializing auth state');
    
    let mounted = true;
    
    const initAuth = async () => {
      try {
        // Get initial session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('AuthContext: Error getting session:', error);
          if (mounted) setLoading(false);
          return;
        }
        
        console.log('AuthContext: Initial session check:', session ? 'found' : 'none');
        
        if (mounted) {
          await processSession(session);
          initialized.current = true;
        }
      } catch (error) {
        console.error('AuthContext: Error initializing auth:', error);
        if (mounted) setLoading(false);
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('AuthContext: Auth state change:', event);
        if (mounted && initialized.current) {
          await processSession(session);
        }
      }
    );

    initAuth();

    return () => {
      mounted = false;
      console.log('AuthContext: Cleaning up auth listener');
      subscription.unsubscribe();
    };
  }, []);

  const value = {
    user,
    session,
    loading,
    login: async (email: string, password: string): Promise<boolean> => {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        return !!data.user;
      } catch (error: any) {
        console.error('Login error:', error);
        throw error;
      }
    },
    register: async (fullName: string, email: string, password: string): Promise<boolean> => {
      try {
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

        if (error) throw error;
        return !!data.user;
      } catch (error: any) {
        console.error('Registration error:', error);
        throw error;
      }
    },
    logout: async () => {
      try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        setUser(null);
        setSession(null);
        setUserRoles([]);
        initialized.current = false;
      } catch (error: any) {
        console.error('Logout error:', error);
        throw error;
      }
    },
    isAdmin,
    userRoles,
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
