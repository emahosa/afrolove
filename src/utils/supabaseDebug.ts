
import { supabase } from "@/integrations/supabase/client";

/**
 * Helper function to debug the credits system by checking various components
 */
export const debugCreditsSystem = async (userId: string) => {
  try {
    console.log("======= CREDITS SYSTEM DEBUG =======");
    console.log("Checking credits system for user:", userId);
    
    // 1. Check if the user exists in profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
      
    if (profileError) {
      console.error("Error fetching profile:", profileError);
    } else {
      console.log("User profile found:", profile);
      console.log("Current credits:", profile?.credits);
    }

    // 2. Check credit_transactions table for this user
    const { data: transactions, error: transactionsError } = await supabase
      .from('credit_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);
      
    if (transactionsError) {
      console.error("Error fetching transactions:", transactionsError);
    } else {
      console.log("Recent transactions:", transactions);
    }

    // 3. Check if the profiles table has RLS policies that might affect credit updates
    console.log("RLS policies may affect credits. Make sure proper policies exist for the profiles table.");

    console.log("======= DEBUG COMPLETE =======");
  } catch (error) {
    console.error("Error in debugCreditsSystem:", error);
  }
};
