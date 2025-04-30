
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const updateUserCredits = async (userId: string, amount: number): Promise<number | null> => {
  try {
    console.log("Updating credits for user:", userId, "amount:", amount);
    
    // Get current credit balance
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('credits')
      .eq('id', userId)
      .single();
      
    if (profileError) {
      console.error("Error fetching current credits:", profileError);
      throw new Error("Could not retrieve current credit balance");
    }
    
    if (!profileData) {
      console.error("No profile found for user:", userId);
      throw new Error("User profile not found");
    }
    
    const currentCredits = profileData.credits || 0;
    const newCredits = currentCredits + amount;
    
    console.log("Current credits:", currentCredits, "New credits:", newCredits);
    
    // Update the user's credits in profiles table
    const { error } = await supabase
      .from('profiles')
      .update({ credits: newCredits })
      .eq('id', userId);
      
    if (error) {
      console.error("Error updating credits in profiles table:", error);
      throw new Error("Failed to update credits in your profile");
    }
    
    // Log the transaction
    const { error: transactionError } = await supabase
      .from('credit_transactions')
      .insert({
        user_id: userId,
        amount: amount,
        transaction_type: amount > 0 ? 'credit' : 'debit',
        description: amount > 0 ? 'Credits added' : 'Credits used'
      });
    
    if (transactionError) {
      console.error("Error logging credit transaction:", transactionError);
      // Don't block the credit update if just the transaction logging fails
    }
    
    console.log("Credits updated successfully:", newCredits);
    return newCredits;
  } catch (error: any) {
    console.error("Error updating credits:", error);
    throw error; // Re-throw the error to be handled by the caller
  }
};
