
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Extended User type with additional profile properties
interface UserProfile extends User {
  name?: string;
  avatar?: string;
  credits?: number;
  subscription?: string;
  voiceProfiles?: any[];
}

interface AuthContextType {
  user: UserProfile | null;
  session: Session | null;
  loading: boolean;
  login: (email: string, password: string, isAdmin: boolean) => Promise<boolean>;
  register: (name: string, email: string, password: string, isAdmin: boolean) => Promise<boolean>;
  logout: () => Promise<void>;
  isAdmin: () => boolean;
  updateUserCredits: (amount: number) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [userRoles, setUserRoles] = useState<string[]>([]);

  useEffect(() => {
    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_, currentSession) => {
        setSession(currentSession);
        if (currentSession?.user) {
          // Enhance the user object with profile data
          const enhancedUser = await enhanceUserWithProfileData(currentSession.user);
          setUser(enhancedUser);
          fetchUserRoles(currentSession.user.id);
        } else {
          setUser(null);
          setUserRoles([]);
        }
        setLoading(false);
      }
    );

    // Then check for existing session
    supabase.auth.getSession().then(async ({ data: { session: currentSession } }) => {
      setSession(currentSession);
      if (currentSession?.user) {
        // Enhance the user object with profile data
        const enhancedUser = await enhanceUserWithProfileData(currentSession.user);
        setUser(enhancedUser);
        fetchUserRoles(currentSession.user.id);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);
  
  // Function to fetch profile data and enhance the user object
  const enhanceUserWithProfileData = async (baseUser: User): Promise<UserProfile> => {
    try {
      // Fetch profile data from profiles table
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', baseUser.id)
        .single();
        
      if (profileError) {
        console.error("Error fetching user profile:", profileError);
        // Return base user with metadata if available
        return {
          ...baseUser,
          name: baseUser.user_metadata?.name || baseUser.user_metadata?.full_name,
          avatar: baseUser.user_metadata?.avatar_url,
          credits: 0,
          subscription: 'free'
        };
      }

      // Fetch voice profiles if they exist
      const { data: voiceProfilesData } = await supabase
        .from('voice_clones')
        .select('*')
        .eq('user_id', baseUser.id);

      // Return enhanced user object with profile data
      return {
        ...baseUser,
        name: profileData.full_name || baseUser.user_metadata?.name,
        avatar: profileData.avatar_url || baseUser.user_metadata?.avatar_url,
        credits: profileData.credits || 0,
        subscription: 'free', // Default to free until we implement subscription system
        voiceProfiles: voiceProfilesData || []
      };
    } catch (error) {
      console.error("Error in enhanceUserWithProfileData:", error);
      // Return base user if there's an error
      return {
        ...baseUser,
        name: baseUser.user_metadata?.name || baseUser.user_metadata?.full_name,
        avatar: baseUser.user_metadata?.avatar_url,
        credits: 0,
        subscription: 'free'
      };
    }
  };
  
  const fetchUserRoles = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);
        
      if (error) {
        console.error("Error fetching user roles:", error);
        setUserRoles([]);
      } else {
        setUserRoles(data.map(item => item.role));
      }
    } catch (error) {
      console.error("Error in fetchUserRoles:", error);
      setUserRoles([]);
    }
  };

  const login = async (email: string, password: string, isAdmin: boolean): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error("Login failed", {
          description: error.message
        });
        return false;
      }

      // Verify if user has the requested role if trying to log in as admin
      if (isAdmin) {
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('*')
          .eq('user_id', data.user.id)
          .eq('role', 'admin')
          .single();

        if (!roleData) {
          toast.error("Access denied", {
            description: "You don't have admin permissions"
          });
          await supabase.auth.signOut();
          return false;
        }
      }

      toast.success("Login successful", {
        description: `Welcome back${data.user?.user_metadata?.name ? ', ' + data.user.user_metadata.name : ''}!`
      });
      return true;
    } catch (error: any) {
      toast.error("Login error", {
        description: error.message
      });
      return false;
    }
  };

  const register = async (name: string, email: string, password: string, isAdmin: boolean): Promise<boolean> => {
    try {
      // Validate inputs before proceeding
      if (!name.trim() || !email.trim() || !password.trim()) {
        toast.error("Registration failed", {
          description: "All fields are required"
        });
        return false;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            full_name: name,
            avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
          },
        },
      });

      if (error) {
        toast.error("Registration failed", {
          description: error.message
        });
        return false;
      }

      // If admin registration, add admin role
      if (isAdmin && data.user) {
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: data.user.id,
            role: 'admin'
          });

        if (roleError) {
          toast.error("Failed to set admin role", {
            description: roleError.message
          });
          return false;
        }
      }

      toast.success("Registration successful", {
        description: "Your account has been created"
      });
      return true;
    } catch (error: any) {
      toast.error("Registration error", {
        description: error.message
      });
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    await supabase.auth.signOut();
    toast.info("You've been logged out");
  };

  const isAdmin = (): boolean => {
    return userRoles.includes('admin');
  };

  const updateUserCredits = async (amount: number): Promise<void> => {
    if (!user) return;
    
    try {
      // First get current credits
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', user.id)
        .single();
        
      if (profileError) {
        toast.error("Failed to update credits", {
          description: "Could not retrieve current credit balance"
        });
        return;
      }
      
      const currentCredits = profileData.credits || 0;
      const newCredits = currentCredits + amount;
      
      // Update credits
      const { error } = await supabase
        .from('profiles')
        .update({ credits: newCredits })
        .eq('id', user.id);
        
      if (error) {
        toast.error("Failed to update credits", {
          description: error.message
        });
        return;
      }
      
      // Update local user state with new credit amount
      setUser(prevUser => prevUser ? { ...prevUser, credits: newCredits } : null);
      
      // Log the transaction
      await supabase
        .from('credit_transactions')
        .insert({
          user_id: user.id,
          amount: amount,
          transaction_type: amount > 0 ? 'credit' : 'debit',
          description: amount > 0 ? 'Credits added' : 'Credits used'
        });
      
      toast.success(amount > 0 ? "Credits added" : "Credits used", {
        description: `${Math.abs(amount)} credits ${amount > 0 ? 'added to' : 'deducted from'} your account`
      });
    } catch (error: any) {
      console.error("Error updating credits:", error);
      toast.error("Failed to update credits", {
        description: error.message
      });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        login,
        register,
        logout,
        isAdmin,
        updateUserCredits,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
