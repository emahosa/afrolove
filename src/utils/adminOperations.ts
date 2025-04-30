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
    
    // First check if we have authenticated users in auth.users through profiles table
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*');
      
    if (profilesError) {
      console.error("Error fetching user profiles:", profilesError);
      throw new Error(`Failed to fetch profiles: ${profilesError.message}`);
    }
    
    if (!profiles || profiles.length === 0) {
      console.log("No profiles found in the database");
      
      // Check if current user exists and add their profile if needed
      const { data: session } = await supabase.auth.getSession();
      
      if (session?.session?.user) {
        try {
          await createProfileForUser(session.session.user);
          // Try fetching again after creating profile
          const { data: newProfiles, error } = await supabase
            .from('profiles')
            .select('*');
            
          if (error) throw error;
          if (newProfiles) return processProfilesToUsersList(newProfiles);
        } catch (err) {
          console.error("Failed to create profile for current user:", err);
        }
      }
      
      return []; // Return empty list if no profiles exist
    }
    
    console.log("Fetched profiles:", profiles);
    return processProfilesToUsersList(profiles);
    
  } catch (error: any) {
    console.error("Error in fetchUsersFromDatabase:", error);
    throw new Error(`Failed to load users: ${error.message}`);
  }
};

// Helper function to process profiles into user list format
const processProfilesToUsersList = (profiles: any[]): any[] => {
  console.log(`Processing ${profiles.length} profiles to user list format`);
  
  return profiles.map(profile => {
    return {
      id: profile.id,
      name: profile.full_name || 'No Name',
      email: profile.username || 'No Email', 
      status: profile.is_suspended ? 'suspended' : 'active',
      role: 'user', // Default role 
      credits: profile.credits || 0,
      joinDate: profile.created_at ? new Date(profile.created_at).toISOString().split('T')[0] : 'Unknown'
    };
  });
};

// Helper function to create a profile for a user
export const createProfileForUser = async (user: any): Promise<boolean> => {
  try {
    console.log("Creating profile for user:", user.id);
    
    if (!user || !user.id) {
      throw new Error("Invalid user object provided");
    }
    
    // Check if profile already exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();
      
    if (existingProfile) {
      console.log("Profile already exists for user:", user.id);
      return true;
    }
    
    // Create new profile
    const { error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        full_name: user.user_metadata?.name || user.user_metadata?.full_name || 'New User',
        username: user.email,
        avatar_url: user.user_metadata?.avatar_url,
        credits: 5 // Default starting credits
      });
        
    if (insertError) {
      console.error("Error creating profile for user:", insertError);
      throw insertError;
    }
    
    console.log("Successfully created profile for user:", user.id);
    return true;
  } catch (error) {
    console.error("Error in createProfileForUser:", error);
    return false;
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
