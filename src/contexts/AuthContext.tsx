
import React, { createContext, useContext, useEffect, useState } from "react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User as SupabaseUser, Session } from "@supabase/supabase-js";

interface VoiceProfile {
  id: string;
  name: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  credits: number;
  subscription?: string;
  avatar?: string;
  roles: string[];
  voiceProfiles?: VoiceProfile[];
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string, isAdminLogin?: boolean) => Promise<boolean>;
  register: (name: string, email: string, password: string, isAdmin?: boolean) => Promise<boolean>;
  logout: () => void;
  updateUserCredits: (amount: number) => void;
  updateUserVoiceProfile: (profileId: string, profileName: string) => void;
  hasRole: (role: string) => boolean;
  isAdmin: () => boolean;
  isModerator: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Function to fetch user roles
  const fetchUserRoles = async (userId: string) => {
    const { data: roles, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching user roles:', error);
      return [];
    }

    return roles.map(r => r.role);
  };

  // Function to update user state with roles
  const updateUserState = async (session: Session | null) => {
    if (session?.user) {
      const roles = await fetchUserRoles(session.user.id);
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      setUser({
        id: session.user.id,
        email: session.user.email!,
        name: profile?.full_name || session.user.email!.split('@')[0],
        credits: profile?.credits || 0,
        avatar: profile?.avatar_url,
        roles: roles,
        voiceProfiles: []
      });
    } else {
      setUser(null);
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session) {
          await updateUserState(session);
        } else {
          setUser(null);
        }
        setIsLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        await updateUserState(session);
      }
      setIsLoading(false);
    });

    // Set up real-time subscription for user_roles changes
    const rolesChannel = supabase.channel('user_roles_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_roles',
          filter: user ? `user_id=eq.${user.id}` : undefined
        },
        async (payload) => {
          if (user) {
            const roles = await fetchUserRoles(user.id);
            setUser(prev => prev ? { ...prev, roles } : null);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
      rolesChannel.unsubscribe();
    };
  }, [user?.id]);

  const login = async (email: string, password: string, isAdminLogin = false) => {
    try {
      setIsLoading(true);
      
      const { data: { session }, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (session) {
        const roles = await fetchUserRoles(session.user.id);
        
        if (isAdminLogin && !roles.includes('admin')) {
          await logout();
          toast({ 
            title: "Access denied", 
            description: "You don't have admin privileges", 
            variant: "destructive" 
          });
          return false;
        }

        await updateUserState(session);
        toast({ title: "Login successful", description: "Welcome back!" });
        return true;
      }

      return false;
    } catch (error) {
      console.error('Login error:', error);
      toast({ 
        title: "Login failed", 
        description: "Invalid credentials", 
        variant: "destructive" 
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string, isAdmin = false) => {
    try {
      setIsLoading(true);
      
      const { data: { session }, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          }
        }
      });

      if (error) throw error;

      if (session?.user) {
        // Insert initial role
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: session.user.id,
            role: isAdmin ? 'admin' : 'user'
          });

        if (roleError) throw roleError;

        await updateUserState(session);
        toast({ 
          title: "Registration successful", 
          description: `Welcome to MelodyVerse${isAdmin ? ' Admin' : ''}!` 
        });
        return true;
      }

      return false;
    } catch (error) {
      console.error('Registration error:', error);
      toast({ 
        title: "Registration failed", 
        description: "An unexpected error occurred", 
        variant: "destructive" 
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    toast({ title: "Logged out", description: "You have been successfully logged out" });
  };

  const updateUserCredits = async (amount: number) => {
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .update({ credits: user.credits + amount })
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      toast({
        title: "Error updating credits",
        description: "Failed to update credits",
        variant: "destructive"
      });
      return;
    }

    setUser(prev => prev ? { ...prev, credits: data.credits } : null);
  };

  const updateUserVoiceProfile = (profileId: string, profileName: string) => {
    if (user) {
      const voiceProfiles = user.voiceProfiles || [];
      const updatedProfiles = [...voiceProfiles, { id: profileId, name: profileName }];
      
      setUser({
        ...user,
        voiceProfiles: updatedProfiles
      });
    }
  };

  const hasRole = (role: string) => {
    return user?.roles.includes(role) || false;
  };

  const isAdmin = () => {
    return hasRole('admin');
  };

  const isModerator = () => {
    return hasRole('moderator');
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isLoading, 
      login, 
      register, 
      logout, 
      updateUserCredits, 
      updateUserVoiceProfile,
      hasRole,
      isAdmin,
      isModerator
    }}>
      {children}
    </AuthContext.Provider>
  );
};
