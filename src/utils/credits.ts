
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const updateUserCredits = async (userId: string, amount: number): Promise<number | null> => {
  try {
    console.log("Updating credits for user:", userId, "amount:", amount);
    
    if (!userId) {
      throw new Error("User ID is required to update credits");
    }

    // Use direct profile table update instead of the problematic RPC function
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('credits')
      .eq('id', userId)
      .single();
    
    if (profileError) {
      console.error("Error fetching user profile:", profileError);
      throw new Error("Failed to fetch user profile");
    }

    // Calculate new credit balance
    const currentCredits = profileData?.credits || 0;
    const newCreditBalance = currentCredits + amount;
    
    // Update the profile with the new credit balance
    const { data: updateData, error: updateError } = await supabase
      .from('profiles')
      .update({ credits: newCreditBalance })
      .eq('id', userId)
      .select('credits')
      .single();
    
    if (updateError) {
      console.error("Error updating user credits:", updateError);
      throw new Error("Failed to update credits");
    }
    
    // Log the transaction
    try {
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
    } catch (transactionErr) {
      console.error("Exception in credit transaction logging:", transactionErr);
      // Continue execution, don't throw here
    }
    
    console.log("Credits updated successfully. New balance:", updateData?.credits);
    return updateData?.credits || null;
    
  } catch (error: any) {
    console.error("Error in updateUserCredits:", error);
    throw error; // Re-throw to be handled by the caller
  }
};
