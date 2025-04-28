
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { AuthContextType, UserProfile } from "@/types/auth";
import { enhanceUserWithProfileData } from "@/utils/userProfile";
import { useUserRoles } from "@/hooks/useUserRoles";
import { handleLogin, handleRegister, initializeAdminAccount } from "@/utils/authOperations";
import { updateUserCredits as updateCredits } from "@/utils/credits";
import { toast } from "sonner";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [initializationComplete, setInitializationComplete] = useState<boolean>(false);
  const { userRoles, fetchUserRoles, isAdmin } = useUserRoles();

  useEffect(() => {
    console.log("Setting up auth listener");
    
    // First set up the auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log("Auth state changed:", event, currentSession?.user?.id);
        
        if (currentSession?.user) {
          console.log("User is logged in, fetching profile data");
          const enhancedUser = await enhanceUserWithProfileData(currentSession.user);
          setSession(currentSession);
          setUser(enhancedUser);
          // Fetch roles outside of the callback to avoid deadlocks
          setTimeout(() => {
            fetchUserRoles(currentSession.user.id);
          }, 0);
        } else {
          console.log("No user in session");
          setSession(null);
          setUser(null);
        }
        
        setLoading(false);
      }
    );

    // Then check for existing session
    const checkSession = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        console.log("Initial session check:", currentSession?.user?.id);
        
        if (currentSession?.user) {
          console.log("Found existing session, fetching profile data");
          const enhancedUser = await enhanceUserWithProfileData(currentSession.user);
          setSession(currentSession);
          setUser(enhancedUser);
          // Fetch roles outside of the callback to avoid deadlocks
          setTimeout(() => {
            fetchUserRoles(currentSession.user.id);
          }, 0);
        } else {
          console.log("No existing session found");
          setUser(null);
          setSession(null);
        }
        
        setLoading(false);
        
        if (!initializationComplete) {
          console.log("Initializing admin account");
          await initializeAdminAccount();
          setInitializationComplete(true);
        }
      } catch (error) {
        console.error("Error checking session:", error);
        setLoading(false);
      }
    };
    
    checkSession();

    return () => {
      console.log("Cleaning up auth listener");
      subscription.unsubscribe();
    };
  }, [fetchUserRoles]);

  const login = handleLogin;
  const register = handleRegister;
  
  const logout = async (): Promise<void> => {
    try {
      console.log("Logging out user");
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      toast.info("You've been logged out");
    } catch (error: any) {
      console.error("Logout error:", error);
      toast.error("Logout failed", {
        description: error.message
      });
    }
  };

  const updateUserCredits = async (amount: number): Promise<void> => {
    if (!user) {
      console.error("Cannot update credits: No user logged in");
      return;
    }
    
    try {
      const newCredits = await updateCredits(user.id, amount);
      if (newCredits !== null) {
        // Update the user state with the new credits value
        setUser(prevUser => prevUser ? { ...prevUser, credits: newCredits } : null);
        console.log("Credits updated in AuthContext:", newCredits);
      }
    } catch (error) {
      console.error("Error updating credits in AuthContext:", error);
    }
  };

  // For debugging purposes
  const contextValue = {
    user,
    session,
    loading,
    login,
    register,
    logout,
    isAdmin,
    updateUserCredits,
  };
  
  console.log("Auth context state:", { 
    user: user?.id, 
    isLoggedIn: !!user,
    isAdmin: isAdmin(),
    loading,
    userRoles
  });

  return (
    <AuthContext.Provider value={contextValue}>
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
