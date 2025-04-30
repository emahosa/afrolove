
import { supabase } from "@/integrations/supabase/client";

/**
 * Helper function to debug the credits system by checking various components
 */
export const debugCreditsSystem = async (userId: string) => {
  try {
    console.log("======= CREDITS SYSTEM DEBUG =======");
    console.log("Checking credits system for user:", userId);
    
    if (!userId) {
      console.error("DEBUG ERROR: No user ID provided");
      return;
    }
    
    // 1. Check auth user
    console.log("Checking auth user data...");
    const { data: authData, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error("DEBUG ERROR: Error fetching auth user:", authError);
    } else if (!authData.user) {
      console.error("DEBUG ERROR: No authenticated user found");
    } else {
      console.log("Auth user found:", authData.user.id, authData.user.email);
      
      if (authData.user.id !== userId) {
        console.warn("DEBUG WARNING: Auth user ID doesn't match provided user ID");
      }
    }
    
    // 2. Check if the user exists in profiles table
    console.log("Checking user profile...");
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
      
    if (profileError) {
      console.error("DEBUG ERROR: Error fetching profile:", profileError);
    } else if (!profile) {
      console.error("DEBUG ERROR: No profile found for this user ID");
    } else {
      console.log("User profile found:", profile);
      console.log("Current credits:", profile?.credits);
    }

    // 3. Check credit_transactions table for this user
    console.log("Checking credit transactions...");
    const { data: transactions, error: transactionsError } = await supabase
      .from('credit_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);
      
    if (transactionsError) {
      console.error("DEBUG ERROR: Error fetching transactions:", transactionsError);
    } else if (!transactions || transactions.length === 0) {
      console.log("No credit transactions found for this user");
    } else {
      console.log("Recent transactions:", transactions);
    }

    // 4. Check if user_roles exists for this user
    console.log("Checking user roles...");
    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', userId);
      
    if (rolesError) {
      console.error("DEBUG ERROR: Error fetching user roles:", rolesError);
    } else if (!roles || roles.length === 0) {
      console.log("No roles assigned to this user");
    } else {
      console.log("User roles:", roles);
    }

    console.log("======= DEBUG COMPLETE =======");
    
    // Return a summary of findings
    return {
      authUserExists: !!authData?.user,
      profileExists: !!profile,
      profileCredits: profile?.credits,
      transactionsCount: transactions?.length || 0,
      rolesCount: roles?.length || 0
    };
  } catch (error) {
    console.error("Error in debugCreditsSystem:", error);
    return {
      error: "Debug process failed",
      details: error
    };
  }
};
