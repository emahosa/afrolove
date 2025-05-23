
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ADMIN_EMAIL = "ellaadahosa@gmail.com";
const ADMIN_PASSWORD = "Admin123!";
const DEFAULT_ADMIN_NAME = "Admin User";

export const initializeAdminAccount = async () => {
  try {
    console.log("AuthOperations: Checking if admin account exists...");
    
    // First check if the admin role exists for any user
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError) {
      console.error("AuthOperations: Error checking for admin users:", roleError);
      return false;
    }

    // If admin role exists, we're done
    if (roleData) {
      console.log("AuthOperations: Admin account already exists:", roleData.user_id);
      
      // Check if ellaadahosa@gmail.com exists and has admin role
      // First find the user by email in auth system
      const { data: signInCheck } = await supabase.auth.signInWithPassword({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
      }).catch(() => ({ data: null }));
      
      // If user exists, check for admin role
      if (signInCheck?.user) {
        console.log("AuthOperations: Found existing admin email account:", signInCheck.user.id);
        
        // Sign out immediately after checking
        await supabase.auth.signOut();
        
        // Check if user has admin role
        const { data: adminRoleCheck } = await supabase
          .from('user_roles')
          .select('*')
          .eq('user_id', signInCheck.user.id)
          .eq('role', 'admin')
          .maybeSingle();
          
        if (!adminRoleCheck) {
          // Add admin role to the user
          const { error: insertRoleError } = await supabase
            .from('user_roles')
            .insert({
              user_id: signInCheck.user.id,
              role: 'admin'
            });
            
          if (insertRoleError) {
            console.error("AuthOperations: Error assigning admin role to existing user:", insertRoleError);
          } else {
            console.log("AuthOperations: Admin role assigned to ellaadahosa@gmail.com");
          }
        }
      }
      
      return true;
    }
    
    console.log("AuthOperations: No admin account found. Creating admin account...");
    
    // Try to sign in with admin email to check if user exists
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });
    
    let userId;
    
    if (signInError) {
      if (signInError.message.includes("Invalid login credentials")) {
        console.log("AuthOperations: Admin account does not exist. Creating new admin account...");
        
        // Create new admin user
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: ADMIN_EMAIL,
          password: ADMIN_PASSWORD,
          options: {
            data: {
              name: DEFAULT_ADMIN_NAME,
              full_name: DEFAULT_ADMIN_NAME,
              avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(DEFAULT_ADMIN_NAME)}&background=random`,
            },
          }
        });
        
        if (signUpError) {
          console.error("AuthOperations: Error creating admin account:", signUpError);
          return false;
        }
        
        if (!signUpData.user) {
          console.error("AuthOperations: No user data returned when creating admin account");
          return false;
        }
        
        userId = signUpData.user.id;
        console.log("AuthOperations: Admin user created with ID:", userId);
      } else {
        console.error("AuthOperations: Error checking for admin account:", signInError);
        return false;
      }
    } else if (signInData.user) {
      // User exists, use this ID
      userId = signInData.user.id;
      console.log("AuthOperations: Found existing admin user with ID:", userId);
      
      // Sign out after checking
      await supabase.auth.signOut();
    }
    
    if (userId) {
      // Create profile for admin user if it doesn't exist
      await createProfileForUser({
        id: userId,
        full_name: DEFAULT_ADMIN_NAME,
        email: ADMIN_EMAIL
      });
      
      // Assign admin role
      const { error: roleInsertError } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role: 'admin'
        });
      
      if (roleInsertError) {
        console.error("AuthOperations: Error assigning admin role:", roleInsertError);
        return false;
      }
      
      console.log("AuthOperations: Admin role assigned successfully to user:", userId);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error("AuthOperations: Error in admin initialization:", error);
    return false;
  }
};

export const handleLogin = async (email: string, password: string, isAdmin: boolean): Promise<boolean> => {
  try {
    if (!email.trim() || !password.trim()) {
      toast.error(email.trim() ? "Password cannot be empty" : "Email cannot be empty");
      return false;
    }

    console.log(`AuthOperations: Attempting to sign in user: ${email}, isAdmin: ${isAdmin}`);

    // First authenticate the user - this is the same for both admin and regular users
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("AuthOperations: Login error:", error);
      toast.error(error.message || "Login failed");
      return false;
    }

    if (!data.session || !data.user) {
      console.error("AuthOperations: No session or user data returned");
      toast.error("Login failed - no session created");
      return false;
    }

    // Ensure user has a profile - create one if it doesn't exist
    await createProfileForUser(data.user);

    // Special case for ellaadahosa@gmail.com - always grant admin access
    if (email === "ellaadahosa@gmail.com") {
      console.log("AuthOperations: Super admin login successful");
      toast.success("Admin login successful");
      return true;
    }

    // If admin login (but not the special admin), verify admin role
    if (isAdmin) {
      console.log("AuthOperations: Checking if user is admin:", data.user.id);
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', data.user.id)
        .eq('role', 'admin');

      console.log("AuthOperations: Admin role check result:", roleData, roleError);

      if (roleError) {
        console.error("AuthOperations: Error checking admin role:", roleError);
        toast.error("Error verifying admin access");
        await supabase.auth.signOut();
        return false;
      }

      if (!roleData || roleData.length === 0) {
        console.error("AuthOperations: User is not an admin");
        toast.error("Access denied - not an admin user");
        await supabase.auth.signOut();
        return false;
      }

      console.log("AuthOperations: Admin login successful");
    }

    toast.success("Login successful");
    return true;
  } catch (error: any) {
    console.error("AuthOperations: Unexpected login error:", error);
    toast.error(error.message || "An unexpected error occurred");
    return false;
  }
};

export const handleRegister = async (name: string, email: string, password: string, isAdmin: boolean): Promise<boolean> => {
  try {
    if (!name.trim() || !email.trim() || !password.trim()) {
      toast.error("All fields are required");
      return false;
    }

    console.log(`AuthOperations: Registering user: ${email}, name: ${name}, isAdmin: ${isAdmin}`);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          full_name: name,
          avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
        },
        emailRedirectTo: window.location.origin + '/login',
      },
    });

    if (error) {
      console.error("AuthOperations: Registration error:", error);
      toast.error(error.message);
      return false;
    }

    if (!data.user) {
      console.error("AuthOperations: No user data returned");
      toast.error("Registration failed - no user created");
      return false;
    }

    console.log("AuthOperations: User registered successfully:", data.user.id);

    // Create profile for the new user
    await createProfileForUser(data.user);

    // Handle role assignment
    if (data.user) {
      try {
        // Set default role (admin or user)
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: data.user.id,
            role: isAdmin ? 'admin' : 'user'
          });

        if (roleError) {
          console.error("AuthOperations: Role assignment error:", roleError);
        } else {
          console.log(`AuthOperations: Assigned ${isAdmin ? 'admin' : 'user'} role to new user`);
        }
      } catch (roleError) {
        console.error("AuthOperations: Exception in role assignment:", roleError);
      }
    }

    // Check if email confirmation is required
    if (data.session === null) {
      toast.success("Registration successful! Please check your email to verify your account.");
      return false; // Return false to indicate no active session (needs email verification)
    }

    toast.success("Registration successful!");
    return true; // Return true since we have an active session
  } catch (error: any) {
    console.error("AuthOperations: Registration error:", error);
    toast.error(error.message || "An unexpected error occurred");
    return false;
  }
};

// Helper function to create a profile for a user
export const createProfileForUser = async (user: any): Promise<boolean> => {
  try {
    if (!user || !user.id) {
      console.error("AuthOperations: Cannot create profile - Invalid user object");
      return false;
    }
    
    console.log("AuthOperations: Creating/verifying profile for user:", user.id);
    
    // Check if profile already exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();
      
    if (existingProfile) {
      console.log("AuthOperations: Profile already exists for user:", user.id);
      return true;
    }
    
    // Extract user data - handle different structures
    const fullName = user.user_metadata?.full_name || 
                    user.user_metadata?.name || 
                    user.full_name || 
                    user.name || 
                    'New User';
    
    const email = user.email || user.user_metadata?.email || user.username || '';
    const avatar = user.user_metadata?.avatar_url || '';
    
    console.log("AuthOperations: Creating new profile with data:", {
      id: user.id,
      fullName,
      email
    });
    
    // Create new profile
    const { error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        full_name: fullName,
        username: email,
        avatar_url: avatar,
        credits: 5 // Default starting credits
      });
        
    if (insertError) {
      console.error("AuthOperations: Error creating profile:", insertError);
      throw insertError;
    }
    
    console.log("AuthOperations: Successfully created profile for user:", user.id);
    return true;
  } catch (error) {
    console.error("AuthOperations: Error in createProfileForUser:", error);
    return false;
  }
};
