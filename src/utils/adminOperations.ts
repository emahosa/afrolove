
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
    console.log("Fetching users from database");
    
    // First try to get users from auth.users (for debugging purposes)
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (!authError && authUsers) {
      console.log("Auth users found:", authUsers.users.length);
    } else {
      console.log("No auth users found or not authorized to view auth users");
    }
    
    // Get profiles with auth user data
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*');
      
    if (profilesError) {
      console.error("Error fetching user profiles:", profilesError);
      throw new Error(`Failed to fetch profiles: ${profilesError.message}`);
    }
    
    // Fetch user roles
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('*');
      
    if (rolesError) {
      console.error("Error fetching user roles:", rolesError);
      throw new Error(`Failed to fetch user roles: ${rolesError.message}`);
    }
    
    console.log("Fetched profiles:", profiles?.length || 0);
    console.log("Raw profiles data:", JSON.stringify(profiles));
    
    // If no profiles found, attempt to add one for the current user
    if ((!profiles || profiles.length === 0) && authUsers?.users?.length > 0) {
      console.log("No profiles found but auth users exist. Trying to populate profiles...");
      
      // Get current auth user
      const { data: currentSession } = await supabase.auth.getSession();
      
      if (currentSession?.session?.user) {
        const user = currentSession.session.user;
        console.log("Current authenticated user:", user);
        
        // Check if profile already exists for this user
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
          
        if (!existingProfile) {
          // Create profile for current user
          const { data: newProfile, error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              full_name: user.user_metadata?.full_name || user.user_metadata?.name || 'New User',
              username: user.email,
              credits: 5,
              created_at: new Date().toISOString()
            })
            .select();
            
          if (insertError) {
            console.error("Error creating profile for current user:", insertError);
          } else {
            console.log("Created profile for current user:", newProfile);
            
            // Add to profiles array if it was created
            if (newProfile) {
              profiles?.push(newProfile[0]);
            }
          }
        }
      }
    }
    
    // Map profiles to user objects with their roles
    const usersWithRoles = (profiles || []).map(profile => {
      const userRole = userRoles?.find(role => role.user_id === profile.id);
      return {
        id: profile.id,
        name: profile.full_name || 'No Name',
        email: profile.username || 'No Email', 
        status: profile.is_suspended ? 'suspended' : 'active',
        role: userRole ? userRole.role : 'user',
        credits: profile.credits || 0,
        joinDate: profile.created_at ? new Date(profile.created_at).toISOString().split('T')[0] : 'Unknown'
      };
    });
    
    console.log("Processed users:", usersWithRoles.length);
    console.log("First few users:", JSON.stringify(usersWithRoles.slice(0, 3)));
    
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
    
    if (!userData.name || !userData.email) {
      throw new Error("User name and email are required");
    }
    
    // Generate a UUID for the new user
    const newUserId = crypto.randomUUID();
    
    // Create profile directly in the profiles table
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: newUserId,
        full_name: userData.name,
        username: userData.email,
        credits: userData.credits || 0,
        is_suspended: userData.status === 'suspended',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
    if (profileError) {
      console.error("Error creating user profile:", profileError);
      throw new Error(`Profile creation failed: ${profileError.message}`);
    }
    
    console.log("Created profile successfully with ID:", newUserId);
    
    // Add role if specified
    const roleToAdd: UserRole = (userData.role as UserRole) || 'user';
    
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: newUserId,
        role: roleToAdd
      });
      
    if (roleError) {
      console.error("Error adding user role:", roleError);
      // If role creation fails, we should still return the user ID since the profile was created
      toast.warning("User created but role assignment failed", { description: roleError.message });
    } else {
      console.log("Added role successfully:", roleToAdd);
    }
    
    return newUserId;
  } catch (error: any) {
    console.error("Error in addUserToDatabase:", error);
    toast.error("Failed to create user", { description: error.message });
    return null;
  }
};
