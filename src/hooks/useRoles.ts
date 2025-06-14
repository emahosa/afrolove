
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

type Role = 'admin' | 'moderator' | 'user' | 'super_admin' | 'voter' | 'subscriber';

export const useRoles = () => {
  const { user } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [adminPermissions, setAdminPermissions] = useState<string[]>([]);
  const [isSubscriberStatus, setIsSubscriberStatus] = useState(false);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  const fetchRoles = useCallback(async () => {
    if (!user) {
      setRoles([]);
      setAdminPermissions([]);
      setIsSubscriberStatus(false);
      setLoading(false);
      setInitialized(true);
      return;
    }

    try {
      console.log("useRoles: Fetching roles for user:", user.id);
      
      // Fetch user roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (rolesError) {
        console.error("useRoles: Error fetching roles:", rolesError);
        setRoles([]);
      } else {
        console.log("useRoles: Roles fetched:", rolesData);
        const fetchedRoles = rolesData.map(item => item.role as Role);
        setRoles(fetchedRoles);
      }

      // Fetch admin permissions
      const { data: permissionsData, error: permissionsError } = await supabase
        .from('admin_permissions')
        .select('permission')
        .eq('user_id', user.id);

      if (permissionsError) {
        console.error("useRoles: Error fetching permissions:", permissionsError);
        setAdminPermissions([]);
      } else {
        const permissions = permissionsData.map(item => item.permission);
        setAdminPermissions(permissions);
      }

      // Check subscription status
      const { data: subscriberResult, error: subscriberError } = await supabase
        .rpc('is_subscriber', { _user_id: user.id });

      if (subscriberError) {
        console.error("useRoles: Error checking subscription:", subscriberError);
        setIsSubscriberStatus(false);
      } else {
        setIsSubscriberStatus(subscriberResult);
      }

    } catch (error) {
      console.error("useRoles: Error in useRoles hook:", error);
      setRoles([]);
      setAdminPermissions([]);
      setIsSubscriberStatus(false);
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
      setAdminPermissions([]);
      setIsSubscriberStatus(false);
      setLoading(false);
      setInitialized(true);
    }
  }, [user, fetchRoles]);

  const hasRole = useCallback((role: Role): boolean => {
    console.log(`useRoles: Checking if user has role ${role}:`, roles.includes(role));
    return roles.includes(role);
  }, [roles]);

  const isSuperAdmin = hasRole('super_admin');
  const isAdminValue = hasRole('admin') || isSuperAdmin;
  const isVoter = hasRole('voter');
  const isSubscriber = hasRole('subscriber') || isSubscriberStatus;

  const hasAdminPermission = useCallback((permission: string): boolean => {
    if (isSuperAdmin) return true;
    return adminPermissions.includes(permission);
  }, [isSuperAdmin, adminPermissions]);

  const canAccessFeature = useCallback((feature: string): boolean => {
    // Super admin can access everything
    if (isSuperAdmin) return true;
    
    // Regular admin needs specific permissions for admin features
    if (isAdminValue && feature.startsWith('admin_')) {
      return hasAdminPermission(feature.replace('admin_', ''));
    }
    
    // Subscribers can access all regular features
    if (isSubscriber) return true;
    
    // Voters can only access contest features
    if (isVoter) {
      return feature === 'contest' || feature === 'voting';
    }
    
    return false;
  }, [isSuperAdmin, isAdminValue, isSubscriber, isVoter, hasAdminPermission]);

  console.log("useRoles: Current state:", { 
    roles, 
    isAdminValue, 
    isSuperAdmin, 
    isVoter, 
    isSubscriber,
    adminPermissions 
  });

  return {
    roles,
    adminPermissions,
    hasRole,
    isAdmin: () => isAdminValue,
    isSuperAdmin: () => isSuperAdmin,
    isModerator: () => hasRole('moderator'),
    isUser: () => hasRole('user') || roles.length === 0,
    isVoter: () => isVoter,
    isSubscriber: () => isSubscriber,
    hasAdminPermission,
    canAccessFeature,
    loading,
    initialized,
    refetchRoles: fetchRoles
  };
};
