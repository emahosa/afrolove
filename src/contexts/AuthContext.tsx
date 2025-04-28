
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Separate interface for profile data
interface ProfileData {
  name?: string;
  avatar_url?: string;
  full_name?: string;
  credits?: number;
  subscription?: string;
  voiceProfiles?: any[];
}

// Interface for our extended user
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

// Admin account constants - placed at the top level for easier management
const ADMIN_EMAIL = "melody.admin@melodyverse.app";
const ADMIN_PASSWORD = "Admin123";
const ADMIN_NAME = "Admin User";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [initializationComplete, setInitializationComplete] = useState<boolean>(false);

  useEffect(() => {
    // First set up auth state listener to avoid missing events
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log("Auth state changed:", event, currentSession?.user?.id);
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
      console.log("Initial session check:", currentSession?.user?.id);
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
      
      // Initialize admin account if needed
      initializeAdminAccount();
    });

    return () => subscription.unsubscribe();
  }, []);

  // Function to initialize admin account
  const initializeAdminAccount = async () => {
    if (initializationComplete) return;
    
    try {
      console.log("Checking if admin account exists...");
      
      // First check if admin exists by trying to sign in
      const { data, error } = await supabase.auth.signInWithPassword({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
      });
      
      if (error && error.message.includes("Invalid login credentials")) {
        // Admin doesn't exist, create one
        console.log("Admin account does not exist. Creating...");
        
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: ADMIN_EMAIL,
          password: ADMIN_PASSWORD,
          options: {
            data: {
              name: ADMIN_NAME,
              full_name: ADMIN_NAME,
              avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(ADMIN_NAME)}&background=random`,
            },
          }
        });
        
        if (signUpError) {
          console.error("Error creating admin account:", signUpError);
        } else if (signUpData.user) {
          console.log("Admin user created:", signUpData.user.id);
          
          // Add admin role
          const { error: roleError } = await supabase
            .from('user_roles')
            .insert({
              user_id: signUpData.user.id,
              role: 'admin'
            });
          
          if (roleError) {
            console.error("Error assigning admin role:", roleError);
          } else {
            console.log("Admin role assigned successfully");
          }
        }
      } else if (data.user) {
        console.log("Admin account already exists:", data.user.id);
        // Sign out if we were just checking
        await supabase.auth.signOut();
      }
      
      setInitializationComplete(true);
    } catch (error) {
      console.error("Error in admin initialization:", error);
    }
  };
  
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
        console.log("Fetched user roles:", data);
        setUserRoles(data.map(item => item.role));
      }
    } catch (error) {
      console.error("Error in fetchUserRoles:", error);
      setUserRoles([]);
    }
  };

  const login = async (email: string, password: string, isAdmin: boolean): Promise<boolean> => {
    console.log("Login function called with:", { email, isAdmin });
    
    try {
      // Input validation
      if (!email.trim()) {
        toast.error("Email cannot be empty");
        return false;
      }

      if (!password.trim()) {
        toast.error("Password cannot be empty");
        return false;
      }

      // Attempt login
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      // Handle login failures
      if (error) {
        console.error("Supabase login error:", error);
        
        if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
          toast.error("The admin account might not be fully set up yet. Try refreshing and trying again.");
        } else {
          toast.error(error.message);
        }
        return false;
      }

      if (!data.session || !data.user) {
        console.error("Login failed: No session or user data returned");
        toast.error("Login failed - no session created");
        return false;
      }

      console.log("Login successful, user ID:", data.user.id);

      // For admin login, verify admin role
      if (isAdmin) {
        console.log("Verifying admin role for user:", data.user.id);
        
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('*')
          .eq('user_id', data.user.id)
          .eq('role', 'admin');

        console.log("Admin role check result:", { roleData, roleError });

        if (roleError) {
          console.error("Role verification error:", roleError);
          toast.error("Could not verify admin status");
          await supabase.auth.signOut();
          return false;
        }

        if (!roleData || roleData.length === 0) {
          console.log("Not an admin user, signing out");
          toast.error("Access denied - not an admin user");
          await supabase.auth.signOut();
          return false;
        }
        
        console.log("Admin role verified successfully");
      }

      // Login successful
      toast.success("Login successful");
      return true;
    } catch (error: any) {
      console.error("Unexpected login error:", error);
      toast.error(error.message || "An unexpected error occurred");
      return false;
    }
  };

  const register = async (name: string, email: string, password: string, isAdmin: boolean): Promise<boolean> => {
    try {
      // Validate inputs before proceeding
      if (!name.trim() || !email.trim() || !password.trim()) {
        toast.error("All fields are required");
        return false;
      }
      
      // Validate email format using RFC 5322 standard
      const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailPattern.test(email)) {
        toast.error("Please enter a valid email address");
        return false;
      }

      console.log("Attempting to register with email:", email);
      
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
        console.error("Registration error:", error);
        toast.error(error.message);
        return false;
      }

      if (!data.user) {
        toast.error("No user data returned");
        return false;
      }

      console.log("User registered successfully:", data.user.id);

      // If admin registration, add admin role
      if (isAdmin && data.user) {
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: data.user.id,
            role: 'admin'
          });

        if (roleError) {
          console.error("Admin role assignment error:", roleError);
          toast.error("Failed to set admin role");
          return false;
        }
        
        console.log("Admin role assigned successfully");
      }

      toast.success("Registration successful");
      return true;
    } catch (error: any) {
      console.error("Registration error:", error);
      toast.error(error.message || "An unexpected error occurred");
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await supabase.auth.signOut();
      toast.info("You've been logged out");
    } catch (error: any) {
      console.error("Logout error:", error);
      toast.error("Logout failed", {
        description: error.message
      });
    }
  };

  const isAdmin = (): boolean => {
    // Check for admin role in the userRoles array
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
