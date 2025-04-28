
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ADMIN_EMAIL = "admin.melodyverse@gmail.com";
const ADMIN_PASSWORD = "Admin123!";
const DEFAULT_ADMIN_NAME = "Admin User";

export const initializeAdminAccount = async () => {
  try {
    console.log("Checking if admin account exists...");
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });
    
    if (error && error.message.includes("Invalid login credentials")) {
      console.log("Admin account does not exist. Creating...");
      
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
        toast.error("Failed to initialize admin account: " + signUpError.message);
      } else if (signUpData.user) {
        console.log("Admin user created:", signUpData.user.id);
        toast.success("Admin account initialized successfully");
        
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: signUpData.user.id,
            role: 'admin'
          });
        
        if (roleError) {
          console.error("Error assigning admin role:", roleError);
        } else {
          console.log("Admin role assigned successfully");
        }
      }
    } else if (data.user) {
      console.log("Admin account already exists:", data.user.id);
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
      return false;
    }

    if (!data.session || !data.user) {
      toast.error("Login failed - no session created");
      return false;
    }

    if (isAdmin) {
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', data.user.id)
        .eq('role', 'admin');

      if (roleError || !roleData?.length) {
        toast.error("Access denied - not an admin user");
        await supabase.auth.signOut();
        return false;
      }
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
        emailRedirectTo: window.location.origin
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

    toast.success("Registration successful!");
    return true;
  } catch (error: any) {
    console.error("Registration error:", error);
    toast.error(error.message || "An unexpected error occurred");
    return false;
  }
};

