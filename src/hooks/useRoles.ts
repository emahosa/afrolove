
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

type Role = 'admin' | 'moderator' | 'user';

export const useRoles = () => {
  const { user } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRoles = async () => {
      if (!user) {
        setRoles([]);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        if (error) {
          console.error("Error fetching roles:", error);
          setRoles([]);
        } else {
          setRoles(data.map(item => item.role as Role));
        }
      } catch (error) {
        console.error("Error in useRoles hook:", error);
        setRoles([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRoles();
  }, [user]);

  const hasRole = (role: Role): boolean => {
    return roles.includes(role);
  };

  return {
    roles,
    hasRole,
    isAdmin: () => hasRole('admin'),
    isModerator: () => hasRole('moderator'),
    isUser: () => hasRole('user') || roles.length === 0, // Default to user role if no explicit roles
    loading
  };
};
