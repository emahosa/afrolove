
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { AuthContextType, UserProfile } from "@/types/auth";
import { enhanceUserWithProfileData } from "@/utils/userProfile";
import { useUserRoles } from "@/hooks/useUserRoles";
import { handleLogin, handleRegister, initializeAdminAccount } from "@/utils/authOperations";
import { updateUserCredits as updateCredits } from "@/utils/credits";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [initializationComplete, setInitializationComplete] = useState<boolean>(false);
  const { userRoles, fetchUserRoles, isAdmin } = useUserRoles();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log("Auth state changed:", event, currentSession?.user?.id);
        setSession(currentSession);
        if (currentSession?.user) {
          const enhancedUser = await enhanceUserWithProfileData(currentSession.user);
          setUser(enhancedUser);
          fetchUserRoles(currentSession.user.id);
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(async ({ data: { session: currentSession } }) => {
      console.log("Initial session check:", currentSession?.user?.id);
      setSession(currentSession);
      if (currentSession?.user) {
        const enhancedUser = await enhanceUserWithProfileData(currentSession.user);
        setUser(enhancedUser);
        fetchUserRoles(currentSession.user.id);
      } else {
        setUser(null);
      }
      setLoading(false);
      
      if (!initializationComplete) {
        await initializeAdminAccount();
        setInitializationComplete(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = handleLogin;
  const register = handleRegister;
  
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

  const updateUserCredits = async (amount: number): Promise<void> => {
    if (!user) return;
    const newCredits = await updateCredits(user.id, amount);
    if (newCredits !== null) {
      setUser(prevUser => prevUser ? { ...prevUser, credits: newCredits } : null);
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

