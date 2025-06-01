
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
    console.log("Admin: Fetching users from database");
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('Admin: Error getting current user:', userError);
      throw new Error('Authentication required');
    }

    console.log('Admin: Current user:', user.email, user.id);

    // Super admin bypass
    const isSuperAdmin = user.email === "ellaadahosa@gmail.com";
    console.log('Admin: Is super admin:', isSuperAdmin);
    
    if (!isSuperAdmin) {
      // Check if they have admin role
      const { data: hasAdminRole, error: roleError } = await supabase
        .rpc('has_role', { _user_id: user.id, _role: 'admin' });

      if (roleError) {
        console.error('Admin: Error checking admin role:', roleError);
        throw new Error('Failed to verify admin access');
      }

      if (!hasAdminRole) {
        console.warn('Admin: User does not have admin role');
        throw new Error('Access denied: Admin role required');
      }
    }
    
    // Fetch user profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*');
      
    if (profilesError) {
      console.error("Admin: Error fetching user profiles:", profilesError);
      throw new Error(`Failed to fetch profiles: ${profilesError.message}`);
    }
    
    console.log("Admin: Raw profiles from database:", profiles);
    
    if (!profiles || profiles.length === 0) {
      console.log("Admin: No profiles found");
      return [];
    }
    
    // Fetch all user roles
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id, role');
      
    if (rolesError) {
      console.error("Admin: Error fetching user roles:", rolesError);
    }
    
    // Create a map of user roles for quick lookup
    const rolesMap = new Map<string, string>();
    if (userRoles) {
      userRoles.forEach(roleRecord => {
        rolesMap.set(roleRecord.user_id, roleRecord.role);
      });
    }
    
    console.log("Admin: Roles map:", rolesMap);
    
    // Process profiles into user list format
    const users = profiles.map(profile => {
      // Determine user role
      let userRole = 'user';
      
      // Special handling for super admin
      if (profile.username === 'ellaadahosa@gmail.com' || profile.id === user.id) {
        userRole = 'admin';
        console.log('Admin: Setting admin role for super admin:', profile.username || profile.id);
      } else {
        userRole = rolesMap.get(profile.id) || 'user';
      }
      
      return {
        id: profile.id,
        name: profile.full_name || 'No Name',
        email: profile.username || 'No Email', 
        status: profile.is_suspended ? 'suspended' : 'active',
        role: userRole,
        credits: profile.credits || 0,
        joinDate: profile.created_at ? new Date(profile.created_at).toISOString().split('T')[0] : 'Unknown'
      };
    });
    
    console.log("Admin: Processed users:", users);
    return users;
    
  } catch (error: any) {
    console.error("Admin: Error in fetchUsersFromDatabase:", error);
    throw new Error(`Failed to load users: ${error.message}`);
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

export const ensureAdminUserExists = async (): Promise<boolean> => {
  try {
    console.log("Ensuring admin user exists...");
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('No authenticated user found');
      return false;
    }
    
    console.log('Current user:', user.email, user.id);
    
    // Check if this is the super admin
    if (user.email === "ellaadahosa@gmail.com") {
      console.log('Super admin detected, ensuring profile exists...');
      
      // Check if profile exists
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      
      if (profileError) {
        console.error('Error checking profile:', profileError);
        return false;
      }
      
      if (!profile) {
        console.log('Creating profile for super admin...');
        const { error: createProfileError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            full_name: 'Admin User',
            username: user.email,
            avatar_url: 'https://ui-avatars.com/api/?name=Admin+User&background=dc2626&color=ffffff',
            credits: 1000
          });
        
        if (createProfileError) {
          console.error('Error creating admin profile:', createProfileError);
          return false;
        }
      }
      
      // Check if admin role exists
      const { data: hasAdminRole, error: roleCheckError } = await supabase
        .rpc('has_role', { _user_id: user.id, _role: 'admin' });
      
      if (roleCheckError) {
        console.error('Error checking admin role:', roleCheckError);
        return false;
      }
      
      if (!hasAdminRole) {
        console.log('Creating admin role for super admin...');
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: user.id,
            role: 'admin'
          });
        
        if (roleError && !roleError.message.includes('duplicate key')) {
          console.error('Error creating admin role:', roleError);
          return false;
        }
      }
      
      console.log('Super admin setup complete');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error ensuring admin user exists:', error);
    return false;
  }
};
