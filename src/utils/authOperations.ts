
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ADMIN_EMAIL = "ellaadahosa@gmail.com";
const ADMIN_PASSWORD = "Admin123!";
const DEFAULT_ADMIN_NAME = "Admin User";

export const initializeAdminAccount = async () => {
  try {
    console.log("Checking if admin account exists...");
    
    const { data: userData, error: userError } = await supabase
      .from('user_roles')
      .select('user_id, role')
      .eq('role', 'admin')
      .maybeSingle();

    if (userError) {
      console.error("Error checking for admin users:", userError);
      return false;
    }

    // If admin role exists, we're done
    if (userData) {
      console.log("Admin account already exists:", userData.user_id);
      return true;
    }
    
    console.log("No admin account found. Checking if we need to assign admin role to existing account.");
    
    // Check if user with ADMIN_EMAIL exists
    const { data: userAuthData, error: authError } = await supabase.auth.signInWithPassword({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });
    
    if (authError) {
      if (authError.message.includes("Invalid login credentials")) {
        console.log("Admin account does not exist. Creating new admin account...");
        
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
          console.error("Error creating admin account:", signUpError);
          return false;
        }
        
        if (!signUpData.user) {
          console.error("No user data returned when creating admin account");
          return false;
        }
        
        console.log("Admin user created, assigning admin role:", signUpData.user.id);
        
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: signUpData.user.id,
            role: 'admin'
          });
        
        if (roleError) {
          console.error("Error assigning admin role:", roleError);
          return false;
        }
        
        console.log("Admin role assigned successfully");
        
        // Sign out after creating admin
        await supabase.auth.signOut();
      } else {
        console.error("Error checking for admin account:", authError);
        return false;
      }
    } else if (userAuthData.user) {
      console.log("Found existing user with admin email:", userAuthData.user.id);
      
      // Check if this user already has admin role
      const { data: existingRole, error: roleCheckError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', userAuthData.user.id)
        .eq('role', 'admin')
        .maybeSingle();
      
      if (roleCheckError) {
        console.error("Error checking admin role:", roleCheckError);
      } else if (!existingRole) {
        console.log("Adding admin role to existing user");
        
        const { error: roleAddError } = await supabase
          .from('user_roles')
          .insert({
            user_id: userAuthData.user.id,
            role: 'admin'
          });
        
        if (roleAddError) {
          console.error("Error assigning admin role:", roleAddError);
        } else {
          console.log("Admin role assigned to existing user");
        }
      } else {
        console.log("User already has admin role");
      }
      
      // Sign out after checking
      await supabase.auth.signOut();
    }
    
    return true;
  } catch (error) {
    console.error("Error in admin initialization:", error);
    return false;
  }
};

export const handleLogin = async (email: string, password: string, isAdmin: boolean): Promise<boolean> => {
  try {
    if (!email.trim() || !password.trim()) {
      toast.error(email.trim() ? "Password cannot be empty" : "Email cannot be empty");
      return false;
    }

    console.log(`Attempting to sign in user: ${email}, isAdmin: ${isAdmin}`);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      if (error.message.includes("Email not confirmed")) {
        toast.error("Please check your inbox and verify your email to log in");
        const { error: resendError } = await supabase.auth.resend({
          type: 'signup',
          email: email
        });
        
        if (!resendError) {
          toast.info("A new confirmation email has been sent to your email address");
        }
      } else {
        toast.error(error.message);
      }
      console.error("Login error:", error);
      return false;
    }

    if (!data.session || !data.user) {
      toast.error("Login failed - no session created");
      console.error("No session or user data returned");
      return false;
    }

    if (isAdmin) {
      console.log("Checking if user is admin:", data.user.id);
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', data.user.id)
        .eq('role', 'admin');

      console.log("Admin role check result:", roleData, roleError);

      if (roleError) {
        console.error("Error checking admin role:", roleError);
        toast.error("Error verifying admin access");
        await supabase.auth.signOut();
        return false;
      }

      if (!roleData || roleData.length === 0) {
        console.error("User is not an admin");
        toast.error("Access denied - not an admin user");
        await supabase.auth.signOut();
        return false;
      }

      console.log("Admin login successful");
    }

    toast.success("Login successful");
    return true;
  } catch (error: any) {
    console.error("Unexpected login error:", error);
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

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          full_name: name,
          avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
        },
      },
    });

    if (error) {
      toast.error(error.message);
      return false;
    }

    if (!data.user) {
      toast.error("No user data returned");
      return false;
    }

    // Even if the session is null due to email confirmation, we still need to try to add the admin role if requested
    if (isAdmin && data.user) {
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: data.user.id,
          role: 'admin'
        });

      if (roleError) {
        console.error("Admin role assignment error:", roleError);
        toast.error("Failed to set admin role");
        return false;
      }
    }

    if (data.session === null) {
      toast.success("Registration successful! Please check your email to verify your account.");
      return false;
    }

    // Set a default user role for regular users
    if (!isAdmin && data.user) {
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: data.user.id,
          role: 'user'
        });

      if (roleError) {
        console.error("User role assignment error:", roleError);
      }
    }

    toast.success("Registration successful!");
    return !!data.session; // Return true only if we have a session
  } catch (error: any) {
    console.error("Registration error:", error);
    toast.error(error.message || "An unexpected error occurred");
    return false;
  }
};
