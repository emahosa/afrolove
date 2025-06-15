import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
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
  register: (fullName: string, email: string, password: string) => Promise<boolean>;
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<ExtendedUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [adminPermissions, setAdminPermissions] = useState<string[]>([]);
  const [subscriberStatus, setSubscriberStatus] = useState(false);

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

  const fetchUserData = async (userId: string) => {
    try {
      console.log('AuthContext: Fetching user data for:', userId);
      
      // Fetch user roles
      const { data: userRoleData, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);
      
      if (rolesError) {
        console.error('AuthContext: Error fetching roles:', rolesError);
        setUserRoles(['voter']); // Default fallback
      } else {
        const roles = userRoleData?.map(r => r.role) || ['voter'];
        console.log('AuthContext: Fetched roles:', roles);
        setUserRoles(roles);
      }

      // Fetch admin permissions
      const { data: permissionsData, error: permissionsError } = await supabase
        .from('admin_permissions')
        .select('permission')
        .eq('user_id', userId);
      
      if (permissionsError) {
        console.error('AuthContext: Error fetching permissions:', permissionsError);
        setAdminPermissions([]);
      } else {
        const permissions = permissionsData?.map(p => p.permission) || [];
        console.log('AuthContext: Fetched permissions:', permissions);
        setAdminPermissions(permissions);
      }

      // Check subscription status
      const { data: isSubscriberResult, error: subscriberError } = await supabase
        .rpc('is_subscriber', { _user_id: userId });
      
      if (subscriberError) {
        console.error('AuthContext: Error checking subscription:', subscriberError);
        setSubscriberStatus(false);
      } else {
        console.log('AuthContext: Subscription status:', isSubscriberResult);
        setSubscriberStatus(isSubscriberResult);
      }
      
    } catch (error) {
      console.error('AuthContext: Error in fetchUserData:', error);
      setUserRoles(['voter']); // Default fallback
      setAdminPermissions([]);
      setSubscriberStatus(false);
    }
  };

  const processSession = async (sessionWithUser: Session) => {
    console.log('AuthContext: Processing session for user:', sessionWithUser.user.id);
    
    try {
      // First set up the basic user object
      let basicUser: ExtendedUser = {
        ...sessionWithUser.user,
        name: sessionWithUser.user.user_metadata.full_name || sessionWithUser.user.email?.split('@')[0] || 'User',
        avatar: sessionWithUser.user.user_metadata.avatar_url || '',
        credits: 5, // Default credits
        subscription: 'free'
      };

      // Try to get profile data
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', sessionWithUser.user.id)
        .maybeSingle();
      
      if (profile && !profileError) {
        console.log('AuthContext: Using profile data:', profile);
        basicUser = {
          ...basicUser,
          name: profile.full_name || basicUser.name,
          avatar: profile.avatar_url || basicUser.avatar,
          credits: profile.credits || 5,
        };
      }
      
      setUser(basicUser);
      
      // Fetch user data after setting user
      await fetchUserData(sessionWithUser.user.id);
      
      console.log('AuthContext: User setup complete for:', basicUser.name);
    } catch (error) {
      console.error('AuthContext: Error processing session:', error);
      // Clear all user state on error
      setUser(null);
      setUserRoles([]);
      setAdminPermissions([]);
      setSubscriberStatus(false);
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
        console.error('Logout error:', error);
        toast.error(error.message || 'Logout failed.');
        throw error;
      }
      // The onAuthStateChange listener will handle clearing user state and session.
    } catch (error: any) {
      console.error('Logout error:', error);
      toast.error(error.message || 'An unexpected error occurred during logout.');
      throw error;
    }
  };

  useEffect(() => {
    console.log('AuthContext: Initializing auth state listener');

    // Get initial session
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      console.log('AuthContext: Initial session check:', initialSession ? 'found' : 'none');
      setSession(initialSession);
      setLoading(false); // Initial loading is done here.
    });
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        console.log(`AuthContext: Auth state change: ${event}`);
        // This is a synchronous call.
        setSession(newSession);
      }
    );

    return () => {
      console.log('AuthContext: Cleaning up auth listener');
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    // This effect runs whenever the session changes.
    const handleSessionChange = async () => {
      if (session) {
        await processSession(session);
      } else {
        // Clear user state if session is null (e.g., after logout)
        setUser(null);
        setUserRoles([]);
        setAdminPermissions([]);
        setSubscriberStatus(false);
        console.log('AuthContext: Session is null, user state cleared.');
      }
    };
    
    // Only run this logic after the initial loading is complete
    if (!loading) {
      handleSessionChange();
    }
  }, [session]);

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
