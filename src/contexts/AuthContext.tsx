
import React, { createContext, useContext, useEffect, useState } from 'react';
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
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching user roles:', error);
        return [];
      }

      return data?.map(r => r.role) || [];
    } catch (error) {
      console.error('Error fetching user roles:', error);
      return [];
    }
  };

  const setupUserProfile = async (user: User) => {
    try {
      console.log('AuthContext: Setting up user profile for:', user.id);
      
      // Fetch user roles
      const roles = await fetchUserRoles(user.id);
      setUserRoles(roles);

      // Fetch or create profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error fetching profile:', profileError);
        // Continue without profile data
      }

      if (!profile && profileError?.code === 'PGRST116') {
        // Profile doesn't exist, create it
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            full_name: user.user_metadata.full_name || user.email?.split('@')[0] || 'User',
            avatar_url: user.user_metadata.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.user_metadata.full_name || 'User')}&background=random`,
            credits: 5
          });

        if (insertError) {
          console.error('Error creating profile:', insertError);
        }
      }

      const updatedUser: ExtendedUser = {
        ...user,
        name: profile?.full_name || user.user_metadata.full_name || user.email?.split('@')[0] || 'User',
        avatar: profile?.avatar_url || user.user_metadata.avatar_url || '',
        credits: profile?.credits || 5,
        subscription: 'free'
      };

      console.log('AuthContext: User profile setup complete:', updatedUser.id);
      setUser(updatedUser);
    } catch (error) {
      console.error('Error setting up user profile:', error);
      // Set basic user data even if profile setup fails
      const basicUser: ExtendedUser = {
        ...user,
        name: user.user_metadata.full_name || user.email?.split('@')[0] || 'User',
        avatar: user.user_metadata.avatar_url || '',
        credits: 5,
        subscription: 'free'
      };
      setUser(basicUser);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);
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
        await setupUserProfile(data.user);
        return true;
      }
      return false;
    } catch (error: any) {
      console.error('Login error:', error);
      setLoading(false);
      throw error;
    }
  };

  const register = async (fullName: string, email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);
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
          // User is automatically logged in
          await setupUserProfile(data.user);
          return true;
        } else {
          // Email confirmation required
          toast.success('Registration successful! Please check your email to verify your account.');
          setLoading(false);
          return true;
        }
      }
      return false;
    } catch (error: any) {
      console.error('Registration error:', error);
      setLoading(false);
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
    } catch (error: any) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  useEffect(() => {
    console.log('AuthContext: Initializing auth state');
    
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('AuthContext: Initial session:', session ? 'found' : 'none');
      setSession(session);
      if (session?.user) {
        setupUserProfile(session.user);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('AuthContext: Auth state change:', event, session ? 'session exists' : 'no session');
        setSession(session);
        
        if (session?.user) {
          await setupUserProfile(session.user);
        } else {
          setUser(null);
          setUserRoles([]);
          setLoading(false);
        }
      }
    );

    return () => {
      console.log('AuthContext: Cleaning up auth listener');
      subscription.unsubscribe();
    };
  }, []);

  const value = {
    user,
    session,
    loading,
    login,
    register,
    logout,
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
