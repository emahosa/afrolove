
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PaymentVerificationResult {
  success: boolean;
  type: 'credits' | 'subscription' | null;
  message: string;
}

export const verifyPaymentSuccess = async (sessionId?: string): Promise<PaymentVerificationResult> => {
  try {
    console.log("Verifying payment success for session:", sessionId);
    
    if (!sessionId) {
      return {
        success: false,
        type: null,
        message: "No session ID provided"
      };
    }

    // Check recent payment transactions for this user
    const { data: user } = await supabase.auth.getUser();
    
    if (!user?.user) {
      return {
        success: false,
        type: null,
        message: "User not authenticated"
      };
    }

    // Check for recent payment transactions with fewer retries but longer waits
    let attempts = 0;
    let transactions = null;
    
    while (attempts < 3 && !transactions) {
      const { data: transactionData, error: transactionError } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('user_id', user.user.id)
        .eq('payment_id', sessionId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1);

      if (!transactionError && transactionData && transactionData.length > 0) {
        transactions = transactionData;
        break;
      }
      
      attempts++;
      if (attempts < 3) {
        await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds before retry
      }
    }

    if (transactions && transactions.length > 0) {
      const transaction = transactions[0];
      const isCredits = transaction.credits_purchased > 0;
      
      // Force refresh user data immediately
      await refreshUserData();
      
      return {
        success: true,
        type: isCredits ? 'credits' : 'subscription',
        message: isCredits 
          ? `${transaction.credits_purchased} credits added successfully`
          : "Subscription activated successfully"
      };
    }

    // If no transaction found, check subscription status directly
    const { data: subData, error: subError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.user.id)
      .eq('subscription_status', 'active')
      .order('created_at', { ascending: false })
      .limit(1);

    if (!subError && subData && subData.length > 0) {
      await refreshUserData();
      return {
        success: true,
        type: 'subscription',
        message: "Subscription verified successfully"
      };
    }

    return {
      success: false,
      type: null,
      message: "Payment verification failed - please contact support if payment was successful"
    };

  } catch (error: any) {
    console.error("Payment verification error:", error);
    return {
      success: false,
      type: null,
      message: error.message || "Verification failed"
    };
  }
};

export const refreshUserData = async (): Promise<void> => {
  try {
    // Force refresh the user session to get updated data
    const { error } = await supabase.auth.refreshSession();
    
    if (error) {
      console.error("Error refreshing session:", error);
      return;
    }

    console.log("User session refreshed successfully");
    
    // Trigger immediate page reload to ensure all components get the updated data
    window.location.reload();
  } catch (error) {
    console.error("Error refreshing user data:", error);
    // Still reload the page to try to get fresh data
    window.location.reload();
  }
};
