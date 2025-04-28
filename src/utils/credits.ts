
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const updateUserCredits = async (userId: string, amount: number): Promise<number | null> => {
  try {
    // Get current credit balance
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('credits')
      .eq('id', userId)
      .single();
      
    if (profileError) {
      console.error("Error fetching current credits:", profileError);
      toast.error("Failed to update credits", {
        description: "Could not retrieve current credit balance"
      });
      return null;
    }
    
    const currentCredits = profileData.credits || 0;
    const newCredits = currentCredits + amount;
    
    // Update the user's credits in profiles table
    const { error } = await supabase
      .from('profiles')
      .update({ credits: newCredits })
      .eq('id', userId);
      
    if (error) {
      console.error("Error updating credits in profiles table:", error);
      toast.error("Failed to update credits", {
        description: error.message
      });
      return null;
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
    
    // Show toast notification
    toast.success(amount > 0 ? "Credits added" : "Credits used", {
      description: `${Math.abs(amount)} credits ${amount > 0 ? 'added to' : 'deducted from'} your account`
    });

    console.log("Credits updated successfully:", newCredits);
    return newCredits;
  } catch (error: any) {
    console.error("Error updating credits:", error);
    toast.error("Failed to update credits", {
      description: error.message
    });
    return null;
  }
};
