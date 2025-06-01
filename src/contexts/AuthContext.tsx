
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
  const initializedRef = useRef(false);

  const isAdmin = () => {
    console.log('AuthContext: Checking admin status for user:', user?.email);
    
    if (user?.email === 'ellaadahosa@gmail.com') {
      console.log('AuthContext: Super admin detected');
      return true;
    }
    
    const hasAdminRole = userRoles.includes('admin');
    console.log('AuthContext: Regular admin check, roles:', userRoles, 'hasAdmin:', hasAdminRole);
    return hasAdminRole;
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
      console.log('AuthContext: Fetching roles for user:', userId);
      
      const { data: hasAdminRole, error: adminError } = await supabase
        .rpc('has_role', { _user_id: userId, _role: 'admin' });
      
      if (adminError) {
        console.error('AuthContext: Error checking admin role:', adminError);
        return [];
      }
      
      const roles = [];
      if (hasAdminRole) {
        roles.push('admin');
      }
      
      const { data: hasModeratorRole, error: modError } = await supabase
        .rpc('has_role', { _user_id: userId, _role: 'moderator' });
      
      if (!modError && hasModeratorRole) {
        roles.push('moderator');
      }
      
      if (roles.length === 0) {
        roles.push('user');
      }
      
      console.log('AuthContext: Fetched roles:', roles);
      return roles;
    } catch (error) {
      console.error('AuthContext: Error fetching user roles:', error);
      return ['user'];
    }
  };

  const ensureAdminProfile = async (userId: string) => {
    try {
      console.log('AuthContext: Ensuring admin profile for:', userId);
      
      const { data: existingProfile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      if (profileError) {
        console.error('AuthContext: Error checking profile:', profileError);
        return false;
      }
      
      if (!existingProfile) {
        console.log('AuthContext: Creating admin profile...');
        const { error: createError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            full_name: 'Admin User',
            username: 'ellaadahosa@gmail.com',
            avatar_url: 'https://ui-avatars.com/api/?name=Admin+User&background=dc2626&color=ffffff',
            credits: 1000
          });
        
        if (createError) {
          console.error('AuthContext: Error creating admin profile:', createError);
          return false;
        }
      }
      
      const { data: hasAdminRole } = await supabase
        .rpc('has_role', { _user_id: userId, _role: 'admin' });
      
      if (!hasAdminRole) {
        console.log('AuthContext: Creating admin role...');
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: userId,
            role: 'admin'
          });
        
        if (roleError) {
          console.error('AuthContext: Error creating admin role:', roleError);
          return false;
        }
      }
      
      console.log('AuthContext: Admin profile setup complete');
      return true;
    } catch (error) {
      console.error('AuthContext: Error ensuring admin profile:', error);
      return false;
    }
  };

  const processSession = async (session: Session | null) => {
    console.log('AuthContext: Processing session:', session ? 'exists' : 'null');
    
    if (session?.user) {
      try {
        const isSuperAdmin = session.user.email === 'ellaadahosa@gmail.com';
        
        if (isSuperAdmin) {
          console.log('AuthContext: Processing super admin session...');
          await ensureAdminProfile(session.user.id);
        }
        
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();
        
        let basicUser: ExtendedUser;
        
        if (profile && !profileError) {
          console.log('AuthContext: Using profile data:', profile);
          basicUser = {
            ...session.user,
            name: profile.full_name || session.user.user_metadata.full_name || 'User',
            avatar: profile.avatar_url || session.user.user_metadata.avatar_url || '',
            credits: profile.credits || 0,
            subscription: 'free'
          };
        } else {
          console.log('AuthContext: Using fallback user data');
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
        
        const roles = await fetchUserRoles(session.user.id);
        setUserRoles(roles);
        
        console.log('AuthContext: User setup complete for:', basicUser.name);
      } catch (error) {
        console.error('AuthContext: Error processing session:', error);
        setUser(null);
        setUserRoles([]);
        setSession(null);
      }
    } else {
      setUser(null);
      setUserRoles([]);
      setSession(null);
    }
    
    setLoading(false);
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
      initializedRef.current = false;
    } catch (error: any) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  useEffect(() => {
    console.log('AuthContext: Initializing auth state');
    
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('AuthContext: Error getting session:', error);
          setLoading(false);
          return;
        }
        
        console.log('AuthContext: Initial session check:', session ? 'found' : 'none');
        
        if (!initializedRef.current) {
          initializedRef.current = true;
          await processSession(session);
        }
      } catch (error) {
        console.error('AuthContext: Error initializing auth:', error);
        setLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('AuthContext: Auth state change:', event);
        
        if (initializedRef.current) {
          await processSession(session);
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
