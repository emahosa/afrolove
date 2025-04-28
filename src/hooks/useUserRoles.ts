
import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useUserRoles = () => {
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const fetchUserRoles = useCallback(async (userId: string) => {
    if (!userId) {
      console.error("useUserRoles: Cannot fetch roles: No user ID provided");
      setUserRoles([]);
      setInitialized(true);
      return;
    }
    
    try {
      setLoading(true);
      console.log("useUserRoles: Fetching roles for user:", userId);
      
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);
        
      if (error) {
        console.error("useUserRoles: Error fetching user roles:", error);
        setUserRoles([]);
      } else {
        const roles = data.map(item => item.role);
        console.log("useUserRoles: Fetched user roles:", roles);
        setUserRoles(roles);
      }
    } catch (error) {
      console.error("useUserRoles: Error in fetchUserRoles:", error);
      setUserRoles([]);
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  }, []);

  const isAdmin = useCallback(() => {
    const hasAdminRole = userRoles.includes('admin');
    console.log("useUserRoles: Checking admin status, roles:", userRoles, "isAdmin:", hasAdminRole);
    return hasAdminRole;
  }, [userRoles]);

  return { 
    userRoles, 
    fetchUserRoles, 
    isAdmin,
    loading,
    initialized
  };
};
