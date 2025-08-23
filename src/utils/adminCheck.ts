
import { supabase } from "@/integrations/supabase/client";

export const checkIfAdminUser = async (userEmail: string): Promise<boolean> => {
  try {
    // Simple profile lookup
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", userEmail.toLowerCase())
      .limit(1);

    if (profileError || !profiles || profiles.length === 0) {
      return false;
    }

    const userId = profiles[0].id;

    // Simple role check
    const { data: roles, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .in('role', ['admin', 'super_admin']);

    if (roleError || !roles) {
      return false;
    }

    return roles.length > 0;
  } catch (error) {
    console.error("Error checking admin status:", error);
    return false;
  }
};
