
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

type Role = 'admin' | 'moderator' | 'user';

export const useRoles = () => {
  const { user } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  const fetchRoles = useCallback(async () => {
    if (!user) {
      setRoles([]);
      setLoading(false);
      setInitialized(true);
      return;
    }

    try {
      console.log("useRoles: Fetching roles for user:", user.id);
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (error) {
        console.error("useRoles: Error fetching roles:", error);
        setRoles([]);
      } else {
        console.log("useRoles: Roles fetched:", data);
        const fetchedRoles = data.map(item => item.role as Role);
        setRoles(fetchedRoles);
      }
    } catch (error) {
      console.error("useRoles: Error in useRoles hook:", error);
      setRoles([]);
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchRoles();
    } else {
      setRoles([]);
      setLoading(false);
      setInitialized(true);
    }
  }, [user, fetchRoles]);

  const hasRole = useCallback((role: Role): boolean => {
    console.log(`useRoles: Checking if user has role ${role}:`, roles.includes(role));
    return roles.includes(role);
  }, [roles]);

  const isAdminValue = hasRole('admin');
  console.log("useRoles: isAdmin value:", isAdminValue);

  return {
    roles,
    hasRole,
    isAdmin: () => isAdminValue,
    isModerator: () => hasRole('moderator'),
    isUser: () => hasRole('user') || roles.length === 0, // Default to user role if no explicit roles
    loading,
    initialized,
    refetchRoles: fetchRoles
  };
};
