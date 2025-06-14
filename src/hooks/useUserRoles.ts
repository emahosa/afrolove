
import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useUserRoles = () => {
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [adminPermissions, setAdminPermissions] = useState<string[]>([]);
  const [isSubscriber, setIsSubscriber] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const fetchUserRoles = useCallback(async (userId: string) => {
    if (!userId) {
      console.error("useUserRoles: Cannot fetch roles: No user ID provided");
      setUserRoles([]);
      setAdminPermissions([]);
      setIsSubscriber(false);
      setInitialized(true);
      return;
    }
    
    try {
      setLoading(true);
      console.log("useUserRoles: Fetching roles for user:", userId);
      
      // Fetch user roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);
        
      if (rolesError) {
        console.error("useUserRoles: Error fetching user roles:", rolesError);
        setUserRoles([]);
      } else {
        const roles = rolesData.map(item => item.role);
        console.log("useUserRoles: Fetched user roles:", roles);
        setUserRoles(roles);
      }

      // Fetch admin permissions if user is an ordinary admin
      const { data: permissionsData, error: permissionsError } = await supabase
        .from('admin_permissions')
        .select('permission')
        .eq('user_id', userId);
        
      if (permissionsError) {
        console.error("useUserRoles: Error fetching admin permissions:", permissionsError);
        setAdminPermissions([]);
      } else {
        const permissions = permissionsData.map(item => item.permission);
        console.log("useUserRoles: Fetched admin permissions:", permissions);
        setAdminPermissions(permissions);
      }

      // Check subscription status
      const { data: isSubscriberResult, error: subscriberError } = await supabase
        .rpc('is_subscriber', { _user_id: userId });
        
      if (subscriberError) {
        console.error("useUserRoles: Error checking subscription:", subscriberError);
        setIsSubscriber(false);
      } else {
        console.log("useUserRoles: Subscription status:", isSubscriberResult);
        setIsSubscriber(isSubscriberResult);
      }
      
    } catch (error) {
      console.error("useUserRoles: Error in fetchUserRoles:", error);
      setUserRoles([]);
      setAdminPermissions([]);
      setIsSubscriber(false);
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  }, []);

  const isSuperAdmin = useCallback(() => {
    return userRoles.includes('super_admin');
  }, [userRoles]);

  const isAdmin = useCallback(() => {
    return userRoles.includes('admin') || userRoles.includes('super_admin');
  }, [userRoles]);

  const isVoter = useCallback(() => {
    return userRoles.includes('voter');
  }, [userRoles]);

  const hasAdminPermission = useCallback((permission: string) => {
    // Super admin has all permissions
    if (isSuperAdmin()) return true;
    // Ordinary admin only has specific permissions
    return adminPermissions.includes(permission);
  }, [adminPermissions, isSuperAdmin]);

  const canAccessFeature = useCallback((feature: string) => {
    // Super admin and ordinary admin can access admin features based on permissions
    if (isAdmin()) {
      if (feature.startsWith('admin_')) {
        return hasAdminPermission(feature.replace('admin_', ''));
      }
      return true;
    }
    
    // Subscribers can access all regular features
    if (isSubscriber) return true;
    
    // Voters can only access contest features
    if (isVoter()) {
      return feature === 'contest' || feature === 'voting';
    }
    
    return false;
  }, [isAdmin, isSubscriber, isVoter, hasAdminPermission]);

  return { 
    userRoles, 
    adminPermissions,
    isSubscriber,
    fetchUserRoles, 
    isAdmin,
    isSuperAdmin,
    isVoter,
    hasAdminPermission,
    canAccessFeature,
    loading,
    initialized
  };
};
