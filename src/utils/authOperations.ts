
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ADMIN_EMAIL = "ellaadahosa@gmail.com";
const ADMIN_PASSWORD = "Admin123!";
const DEFAULT_ADMIN_NAME = "Admin User";

export const initializeAdminAccount = async () => {
  try {
    console.log("AuthOperations: Checking if admin account exists...");
    
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError) {
      console.error("AuthOperations: Error checking for admin users:", roleError);
      return false;
    }

    if (roleData) {
      console.log("AuthOperations: Admin account already exists:", roleData.user_id);
      return true;
    }
    
    console.log("AuthOperations: No admin account found. Creating admin account...");
    
    const { data: currentSession } = await supabase.auth.getSession();
    const currentUser = currentSession.session?.user;
    
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
    
    if (signUpError && !signUpError.message.includes("User already registered")) {
      console.error("AuthOperations: Error creating admin account:", signUpError);
      return false;
    }
    
    let adminUserId;
    
    if (signUpData.user) {
      adminUserId = signUpData.user.id;
      console.log("AuthOperations: Admin user created with ID:", adminUserId);
    } else {
      const { data: userData } = await supabase.auth.signInWithPassword({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
      });
      
      if (userData.user) {
        adminUserId = userData.user.id;
        console.log("AuthOperations: Found existing admin user with ID:", adminUserId);
        
        await supabase.auth.signOut();
        if (currentUser) {
          console.log("AuthOperations: Restoring original user session");
        }
      }
    }
    
    if (adminUserId) {
      const { error: roleInsertError } = await supabase
        .from('user_roles')
        .insert({
          user_id: adminUserId,
          role: 'admin'
        });
      
      if (roleInsertError && !roleInsertError.message.includes("duplicate key")) {
        console.error("AuthOperations: Error assigning admin role:", roleInsertError);
        return false;
      }
      
      console.log("AuthOperations: Admin role assigned successfully to user:", adminUserId);
    }
    
    return true;
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

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("AuthOperations: Login error:", error);
      
      if (error.message.includes("Email not confirmed")) {
        toast.error("Please check your email and click the verification link before signing in");
      } else if (error.message.includes("Invalid login credentials")) {
        toast.error("Invalid email or password. Please check your credentials and try again.");
      } else {
        toast.error(error.message || "Login failed");
      }
      return false;
    }

    if (!data.session || !data.user) {
      console.error("AuthOperations: No session or user data returned");
      toast.error("Login failed - no session created");
      return false;
    }

    if (email === "ellaadahosa@gmail.com") {
      console.log("AuthOperations: Super admin login successful");
      toast.success("Admin login successful");
      return true;
    }

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
        emailRedirectTo: window.location.origin + '/dashboard',
      },
    });

    if (error) {
      console.error("AuthOperations: Registration error:", error);
      
      if (error.message.includes("User already registered")) {
        toast.error("An account with this email already exists. Please sign in instead.");
      } else {
        toast.error(error.message);
      }
      return false;
    }

    if (!data.user) {
      console.error("AuthOperations: No user data returned");
      toast.error("Registration failed - no user created");
      return false;
    }

    console.log("AuthOperations: User registered successfully:", data.user.id);

    if (data.session === null) {
      console.log("AuthOperations: Email confirmation required");
      toast.info("Please check your email to verify your account before signing in");
      return false;
    }

    console.log("AuthOperations: Registration successful with active session");
    toast.success("Registration successful! Welcome to Afroverse!");
    return true;
  } catch (error: any) {
    console.error("AuthOperations: Registration error:", error);
    toast.error(error.message || "An unexpected error occurred");
    return false;
  }
};
