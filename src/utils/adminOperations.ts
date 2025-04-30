
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Database } from "@/integrations/supabase/types";

type UserRole = Database["public"]["Enums"]["user_role"];

interface UserUpdateData {
  name?: string;
  email?: string;
  credits?: number;
  status?: string;
  role?: UserRole;
}

export const updateUserInDatabase = async (userId: string, userData: UserUpdateData): Promise<boolean> => {
  try {
    console.log("Updating user in database:", userId, userData);
    
    // Update the user profile (name, credits, status)
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        full_name: userData.name,
        credits: userData.credits,
        is_suspended: userData.status === 'suspended'
      })
      .eq('id', userId);
    
    if (profileError) {
      console.error("Error updating user profile:", profileError);
      throw new Error(`Profile update failed: ${profileError.message}`);
    }
    
    // If role is being updated, handle that separately
    if (userData.role) {
      // First check if user already has any role
      const { data: existingRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);
      
      if (rolesError) {
        console.error("Error checking user roles:", rolesError);
        throw new Error(`Role check failed: ${rolesError.message}`);
      }
      
      if (existingRoles && existingRoles.length > 0) {
        // Update existing role
        const { error: updateRoleError } = await supabase
          .from('user_roles')
          .update({ role: userData.role })
          .eq('user_id', userId);
        
        if (updateRoleError) {
          console.error("Error updating user role:", updateRoleError);
          throw new Error(`Role update failed: ${updateRoleError.message}`);
        }
      } else {
        // Insert new role
        const { error: insertRoleError } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: userData.role });
        
        if (insertRoleError) {
          console.error("Error inserting user role:", insertRoleError);
          throw new Error(`Role insert failed: ${insertRoleError.message}`);
        }
      }
    }
    
    return true;
  } catch (error: any) {
    console.error("Error in updateUserInDatabase:", error);
    toast.error("Update failed", { description: error.message });
    return false;
  }
};

export const fetchUsersFromDatabase = async (): Promise<any[]> => {
  try {
    // Fetch user profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*');
      
    if (profilesError) {
      console.error("Error fetching user profiles:", profilesError);
      throw new Error(`Failed to fetch user profiles: ${profilesError.message}`);
    }
    
    // Fetch user roles
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('*');
      
    if (rolesError) {
      console.error("Error fetching user roles:", rolesError);
      throw new Error(`Failed to fetch user roles: ${rolesError.message}`);
    }
    
    // Map roles to user profiles
    const usersWithRoles = profiles.map(profile => {
      const userRole = userRoles.find(role => role.user_id === profile.id);
      return {
        id: profile.id,
        name: profile.full_name || 'No Name',
        email: profile.username || 'No Email', // Using username as email since we don't have email directly
        status: profile.is_suspended ? 'suspended' : 'active',
        role: userRole ? userRole.role : 'user',
        credits: profile.credits || 0,
        joinDate: new Date(profile.created_at).toISOString().split('T')[0]
      };
    });
    
    return usersWithRoles;
  } catch (error: any) {
    console.error("Error in fetchUsersFromDatabase:", error);
    toast.error("Failed to load users", { description: error.message });
    return [];
  }
};

export const toggleUserBanStatus = async (userId: string, currentStatus: string): Promise<boolean> => {
  try {
    const newIsSuspended = currentStatus !== 'suspended';
    
    const { error } = await supabase
      .from('profiles')
      .update({ is_suspended: newIsSuspended })
      .eq('id', userId);
      
    if (error) {
      console.error("Error toggling user ban status:", error);
      throw new Error(`Failed to update user status: ${error.message}`);
    }
    
    return true;
  } catch (error: any) {
    console.error("Error in toggleUserBanStatus:", error);
    toast.error("Failed to update user status", { description: error.message });
    return false;
  }
};

export const addUserToDatabase = async (userData: UserUpdateData): Promise<string | null> => {
  try {
    console.log("Adding new user to database:", userData);
    
    // For a real implementation, you would need to create an auth user first
    // This is a simplified version that just creates a profile
    
    // Generate a UUID for the new user
    const newUserId = crypto.randomUUID();
    
    // Create profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: newUserId,
        full_name: userData.name,
        username: userData.email,
        credits: userData.credits || 0,
        is_suspended: userData.status === 'suspended'
      });
      
    if (profileError) {
      console.error("Error creating user profile:", profileError);
      throw new Error(`Profile creation failed: ${profileError.message}`);
    }
    
    // Add role
    if (userData.role) {
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: newUserId,
          role: userData.role as UserRole
        });
        
      if (roleError) {
        console.error("Error adding user role:", roleError);
        throw new Error(`Role creation failed: ${roleError.message}`);
      }
    }
    
    return newUserId;
  } catch (error: any) {
    console.error("Error in addUserToDatabase:", error);
    toast.error("Failed to create user", { description: error.message });
    return null;
  }
};
