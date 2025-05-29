
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const updateUserCredits = async (userId: string, amount: number): Promise<number | null> => {
  try {
    console.log("Credits: Updating credits for user:", userId, "amount:", amount);
    
    // Use the RPC function to update credits
    const { data, error } = await supabase.rpc('update_user_credits', {
      p_user_id: userId,
      p_amount: amount
    });
    
    if (error) {
      console.error("Credits: RPC function error:", error);
      throw new Error(`Failed to update credits: ${error.message}`);
    }
    
    console.log("Credits: Successfully updated, new balance:", data);
    
    if (amount > 0) {
      toast.success(`${amount} credits added to your account`);
    } else {
      toast.info(`${Math.abs(amount)} credits used`);
    }
    
    return data;
  } catch (error: any) {
    console.error("Credits: Error updating credits:", error);
    toast.error("Failed to update credits", {
      description: error.message
    });
    throw error;
  }
};

export const checkUserCredits = async (userId: string): Promise<number> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('credits')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error("Credits: Error checking credits:", error);
      throw new Error(`Failed to check credits: ${error.message}`);
    }
    
    return data?.credits || 0;
  } catch (error: any) {
    console.error("Credits: Error in checkUserCredits:", error);
    throw error;
  }
};
