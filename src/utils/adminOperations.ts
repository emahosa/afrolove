
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
  permissions?: string[];
}

export const updateUserInDatabase = async (userId: string, userData: UserUpdateData): Promise<boolean> => {
  try {
    console.log("Updating user in database:", userId, userData);
    
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
    
    if (userData.role) {
      const { data: existingRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);
      
      if (rolesError) {
        console.error("Error checking user roles:", rolesError);
        throw new Error(`Role check failed: ${rolesError.message}`);
      }
      
      if (existingRoles && existingRoles.length > 0) {
        const { error: updateRoleError } = await supabase
          .from('user_roles')
          .update({ role: userData.role })
          .eq('user_id', userId);
        
        if (updateRoleError) {
          console.error("Error updating user role:", updateRoleError);
          throw new Error(`Role update failed: ${updateRoleError.message}`);
        }
      } else {
        const { error: insertRoleError } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: userData.role });
        
        if (insertRoleError) {
          console.error("Error inserting user role:", insertRoleError);
          throw new Error(`Role insert failed: ${insertRoleError.message}`);
        }
      }

      // Handle admin permissions if role is admin
      if (userData.role === 'admin' && userData.permissions) {
        // Delete existing permissions
        await supabase
          .from('admin_permissions')
          .delete()
          .eq('user_id', userId);

        // Insert new permissions
        if (userData.permissions.length > 0) {
          const permissionsToInsert = userData.permissions.map(permission => ({
            user_id: userId,
            permission: permission
          }));

          const { error: permissionsError } = await supabase
            .from('admin_permissions')
            .insert(permissionsToInsert);

          if (permissionsError) {
            console.error("Error updating admin permissions:", permissionsError);
            throw new Error(`Permissions update failed: ${permissionsError.message}`);
          }
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
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('Error getting current user:', userError);
      return [];
    }

    console.log('Current user:', user.email, user.id);
    
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*');
      
    if (profilesError) {
      console.error("Error fetching user profiles:", profilesError);
      return [];
    }
    
    console.log("Raw profiles from database:", profiles);
    
    if (!profiles || profiles.length === 0) {
      console.log("No profiles found");
      return [];
    }
    
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id, role');
      
    if (rolesError) {
      console.error("Error fetching user roles:", rolesError);
    }
    
    const rolesMap = new Map<string, string>();
    if (userRoles) {
      userRoles.forEach(roleRecord => {
        rolesMap.set(roleRecord.user_id, roleRecord.role);
      });
    }
    
    console.log("Roles map:", rolesMap);
    
    const users = profiles.map(profile => {
      let userRole = 'user';
      
      if (profile.username === 'ellaadahosa@gmail.com' || profile.id === user.id) {
        userRole = 'admin';
        console.log('Setting admin role for super admin:', profile.username || profile.id);
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
    
    console.log("Processed users:", users);
    return users;
    
  } catch (error: any) {
    console.error("Error in fetchUsersFromDatabase:", error);
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
    
    const newUserId = crypto.randomUUID();
    
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
    
    const roleToAdd: UserRole = (userData.role as UserRole) || 'voter';
    
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

    // Add admin permissions if role is admin
    if (roleToAdd === 'admin' && userData.permissions && userData.permissions.length > 0) {
      const permissionsToInsert = userData.permissions.map(permission => ({
        user_id: newUserId,
        permission: permission
      }));

      const { error: permissionsError } = await supabase
        .from('admin_permissions')
        .insert(permissionsToInsert);

      if (permissionsError) {
        console.error("Error adding admin permissions:", permissionsError);
        toast.warning("User created but permissions assignment failed", { description: permissionsError.message });
      }
    }

    // Create subscription record
    const { error: subscriptionError } = await supabase
      .from('user_subscriptions')
      .insert({
        user_id: newUserId,
        subscription_type: roleToAdd === 'subscriber' ? 'premium' : 'free',
        subscription_status: roleToAdd === 'subscriber' ? 'active' : 'inactive'
      });

    if (subscriptionError) {
      console.error("Error creating subscription record:", subscriptionError);
      // Not critical, continue
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
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('No authenticated user found');
      return false;
    }
    
    console.log('Current user:', user.email, user.id);
    
    if (user.email === "ellaadahosa@gmail.com") {
      console.log('Super admin detected, ensuring profile exists...');
      
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
