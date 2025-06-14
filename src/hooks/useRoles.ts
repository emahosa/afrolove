
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

type Role = 'admin' | 'moderator' | 'user' | 'super_admin' | 'voter' | 'subscriber';

export const useRoles = () => {
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [adminPermissions, setAdminPermissions] = useState<string[]>([]);
  const [isSubscriberStatus, setIsSubscriberStatus] = useState(false);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const fetchCurrentSession = async () => {
      const { data } = await supabase.auth.getSession();
      setUser(data.session?.user ?? null);
    };
    fetchCurrentSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

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
      // Fetch user roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (rolesError) {
        console.error("useRoles: Error fetching roles:", rolesError);
        setRoles([]);
      } else {
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
    if (user === null) {
      // No user, stop loading
      setLoading(false);
      setInitialized(true);
      setRoles([]);
      setAdminPermissions([]);
      setIsSubscriberStatus(false);
    } else if (user) {
      // User is present, fetch roles
      fetchRoles();
    }
    // if user is undefined, we are still waiting for the initial session
  }, [user, fetchRoles]);

  const hasRole = useCallback((role: Role): boolean => {
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
