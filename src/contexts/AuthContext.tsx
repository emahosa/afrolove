
import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { AuthContextType, UserProfile } from "@/types/auth";
import { enhanceUserWithProfileData } from "@/utils/userProfile";
import { handleLogin, handleRegister, initializeAdminAccount } from "@/utils/authOperations";
import { updateUserCredits as updateCredits } from "@/utils/credits";
import { toast } from "sonner";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [rolesLoading, setRolesLoading] = useState<boolean>(true);
  const [initializationComplete, setInitializationComplete] = useState<boolean>(false);
  const [mfaEnabled, setMfaEnabled] = useState<boolean>(false);

  const fetchUserRoles = useCallback(async (userId: string) => {
    if (!userId) {
      console.log("AuthContext: Cannot fetch roles without user ID");
      setUserRoles([]);
      setRolesLoading(false);
      return;
    }
    
    try {
      console.log("AuthContext: Fetching roles for user:", userId);
      
      // Important: Using the public client with RLS policies
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);
        
      if (error) {
        console.error("AuthContext: Error fetching user roles:", error);
        setUserRoles([]);
      } else {
        const roles = data.map(item => item.role);
        console.log("AuthContext: Fetched user roles:", roles);
        setUserRoles(roles);
      }
    } catch (error) {
      console.error("AuthContext: Error in fetchUserRoles:", error);
      setUserRoles([]);
    } finally {
      setRolesLoading(false);
    }
  }, []);

  const isAdmin = useCallback(() => {
    if (!user) return false;
    
    if (user.email === "ellaadahosa@gmail.com") {
      console.log("AuthContext: Super admin access granted to ellaadahosa@gmail.com");
      return true;
    }
    
    const hasAdminRole = userRoles.includes('admin');
    console.log("AuthContext: Admin check for regular user, roles:", userRoles, "isAdmin:", hasAdminRole);
    return hasAdminRole;
  }, [userRoles, user]);

  const updateAuthUser = useCallback(async (currentSession: Session | null) => {
    try {
      if (currentSession?.user) {
        console.log("AuthContext: User is logged in, fetching profile data");
        
        // Set user and session first to avoid delays in UI updates
        setSession(currentSession);
        
        // Use basic user info first, then update with profile data
        const basicUser: UserProfile = {
          ...currentSession.user,
          name: currentSession.user.user_metadata?.name || 'User',
          avatar: currentSession.user.user_metadata?.avatar_url || '',
          credits: 0,
          subscription: 'free'
        };
        
        setUser(basicUser);
        
        // Then fetch roles - without this admin check won't work
        await fetchUserRoles(currentSession.user.id);
        
        // Then enhance with profile data
        try {
          const enhancedUser = await enhanceUserWithProfileData(currentSession.user);
          setUser(enhancedUser);
          
          // Check MFA status for the user
          const { data: factorData } = await supabase.auth.mfa.listFactors();
          setMfaEnabled(factorData?.totp && factorData.totp.length > 0);
          
        } catch (error) {
          console.error("AuthContext: Error fetching profile data:", error);
          // User is already set with basic info, so no action needed
        }
      } else {
        console.log("AuthContext: No user in session");
        setSession(null);
        setUser(null);
        setUserRoles([]);
        setRolesLoading(false);
        setMfaEnabled(false);
      }
    } catch (error) {
      console.error("AuthContext: Error updating auth user:", error);
    } finally {
      setLoading(false);
    }
  }, [fetchUserRoles]);

  useEffect(() => {
    console.log("AuthContext: Setting up auth listener");
    
    const setupAuth = async () => {
      try {
        // First check for existing session
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
        setRolesLoading(false);
      }
    };
    
    // Set up the auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log("AuthContext: Auth state changed:", event, currentSession?.user?.id);
        
        // Use setTimeout to avoid potential circular calls within the event handler
        setTimeout(() => {
          updateAuthUser(currentSession);
        }, 0);
      }
    );

    setupAuth();
    
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
      setUserRoles([]);
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

  const authIsReady = !loading && !rolesLoading;
  
  const contextValue = {
    user,
    session,
    loading: !authIsReady,
    login,
    register,
    logout,
    isAdmin,
    updateUserCredits,
    mfaEnabled,
  };
  
  console.log("AuthContext: Auth context state:", { 
    user: user?.id, 
    isLoggedIn: !!user,
    userEmail: user?.email,
    isAdmin: isAdmin(),
    mfaEnabled,
    loading: !authIsReady,
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
