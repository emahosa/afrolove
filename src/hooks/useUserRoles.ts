
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useUserRoles = () => {
  const [userRoles, setUserRoles] = useState<string[]>([]);

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

  const isAdmin = () => userRoles.includes('admin');

  return { userRoles, fetchUserRoles, isAdmin };
};

