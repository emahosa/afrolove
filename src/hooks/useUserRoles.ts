
import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useUserRoles = () => {
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchUserRoles = useCallback(async (userId: string) => {
    if (!userId) {
      console.error("useUserRoles: Cannot fetch roles: No user ID provided");
      setUserRoles([]);
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
        console.log("useUserRoles: Fetched user roles:", data);
        setUserRoles(data.map(item => item.role));
      }
    } catch (error) {
      console.error("useUserRoles: Error in fetchUserRoles:", error);
      setUserRoles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const isAdmin = useCallback(() => {
    console.log("useUserRoles: Checking admin status, roles:", userRoles);
    return userRoles.includes('admin');
  }, [userRoles]);

  return { 
    userRoles, 
    fetchUserRoles, 
    isAdmin,
    loading 
  };
};
