
import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
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
  const { userRoles, fetchUserRoles, isAdmin, initialized: rolesInitialized } = useUserRoles();

  const updateAuthUser = useCallback(async (currentSession: Session | null) => {
    try {
      if (currentSession?.user) {
        console.log("AuthContext: User is logged in, fetching profile data");
        
        // First get user data
        const enhancedUser = await enhanceUserWithProfileData(currentSession.user)
          .catch(error => {
            console.error("AuthContext: Error enhancing user data:", error);
            // Return basic user data as fallback
            return {
              id: currentSession.user.id,
              email: currentSession.user.email || '',
              name: currentSession.user.user_metadata?.name || 'User',
              avatar: currentSession.user.user_metadata?.avatar_url || '',
              credits: 0,
              subscription: 'free'
            } as UserProfile;
          });
          
        setSession(currentSession);
        setUser(enhancedUser);
        
        // Fetch roles after setting user data
        await fetchUserRoles(currentSession.user.id);
      } else {
        console.log("AuthContext: No user in session");
        setSession(null);
        setUser(null);
      }
    } catch (error) {
      console.error("AuthContext: Error updating auth user:", error);
    } finally {
      setLoading(false);
    }
  }, [fetchUserRoles]);

  useEffect(() => {
    console.log("AuthContext: Setting up auth listener");
    
    // First set up the auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log("AuthContext: Auth state changed:", event, currentSession?.user?.id);
        await updateAuthUser(currentSession);
      }
    );

    // Then check for existing session
    const checkSession = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        console.log("AuthContext: Initial session check:", currentSession?.user?.id);
        
        await updateAuthUser(currentSession);
        
        if (!initializationComplete) {
          console.log("AuthContext: Initializing admin account");
          await initializeAdminAccount();
          setInitializationComplete(true);
        }
      } catch (error) {
        console.error("AuthContext: Error checking session:", error);
        setLoading(false);
      }
    };
    
    checkSession();

    return () => {
      console.log("AuthContext: Cleaning up auth listener");
      subscription.unsubscribe();
    };
  }, [updateAuthUser, initializationComplete]);

  const login = handleLogin;
  const register = handleRegister;
  
  const logout = async (): Promise<void> => {
    try {
      console.log("AuthContext: Logging out user");
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      toast.info("You've been logged out");
    } catch (error: any) {
      console.error("AuthContext: Logout error:", error);
      toast.error("Logout failed", {
        description: error.message
      });
    }
  };

  const updateUserCredits = async (amount: number): Promise<void> => {
    if (!user) {
      console.error("AuthContext: Cannot update credits: No user logged in");
      return;
    }
    
    try {
      const newCredits = await updateCredits(user.id, amount);
      if (newCredits !== null) {
        // Update the user state with the new credits value
        setUser(prevUser => prevUser ? { ...prevUser, credits: newCredits } : null);
        console.log("AuthContext: Credits updated in AuthContext:", newCredits);
      }
    } catch (error) {
      console.error("AuthContext: Error updating credits in AuthContext:", error);
    }
  };

  // Important: Get the admin status ONCE per render to avoid constant rechecking
  const isAdminValue = isAdmin();
  console.log("AuthContext: Admin check result:", isAdminValue, "userRoles:", userRoles);

  const contextValue = {
    user,
    session,
    loading: loading || !rolesInitialized,
    login,
    register,
    logout,
    isAdmin: () => isAdminValue,
    updateUserCredits,
  };
  
  console.log("AuthContext: Auth context state:", { 
    user: user?.id, 
    isLoggedIn: !!user,
    isAdmin: isAdminValue,
    loading: loading || !rolesInitialized,
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
