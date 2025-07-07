
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

    // Get current user
    const { data: user } = await supabase.auth.getUser();
    
    if (!user?.user) {
      return {
        success: false,
        type: null,
        message: "User not authenticated"
      };
    }

    // Wait for webhook to process
    console.log("Waiting for webhook to process payment...");
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check for payment transaction with increased attempts
    let attempts = 0;
    const maxAttempts = 15; // Increased from 10
    
    while (attempts < maxAttempts) {
      console.log(`Attempt ${attempts + 1}/${maxAttempts}: Checking for payment transaction`);
      
      // Check payment transactions
      const { data: transactionData, error: transactionError } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('user_id', user.user.id)
        .eq('payment_id', sessionId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1);

      if (!transactionError && transactionData && transactionData.length > 0) {
        const transaction = transactionData[0];
        console.log("Found payment transaction:", transaction);
        
        const isCredits = transaction.credits_purchased > 0;
        
        // Refresh user session to get updated data
        await supabase.auth.refreshSession();
        
        // Trigger a page reload to ensure all data is fresh
        setTimeout(() => {
          window.location.reload();
        }, 1000);
        
        return {
          success: true,
          type: isCredits ? 'credits' : 'subscription',
          message: isCredits 
            ? `${transaction.credits_purchased} credits added successfully`
            : "Subscription activated successfully"
        };
      }
      
      // Also check for subscription updates
      const { data: subData, error: subError } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.user.id)
        .eq('subscription_status', 'active')
        .order('created_at', { ascending: false })
        .limit(1);

      if (!subError && subData && subData.length > 0) {
        console.log("Found active subscription:", subData[0]);
        
        // Check if this is a recent subscription (within last 5 minutes)
        const subscriptionTime = new Date(subData[0].created_at || subData[0].updated_at);
        const now = new Date();
        const timeDiff = now.getTime() - subscriptionTime.getTime();
        const fiveMinutes = 5 * 60 * 1000;
        
        if (timeDiff <= fiveMinutes) {
          await supabase.auth.refreshSession();
          setTimeout(() => {
            window.location.reload();
          }, 1000);
          
          return {
            success: true,
            type: 'subscription',
            message: "Subscription verified successfully"
          };
        }
      }
      
      attempts++;
      if (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    return {
      success: false,
      type: null,
      message: "Payment verification timed out. Please check your account or contact support if payment was successful."
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
    console.log("Refreshing user session data...");
    
    // Force refresh the user session
    const { error } = await supabase.auth.refreshSession();
    
    if (error) {
      console.error("Error refreshing session:", error);
    } else {
      console.log("User session refreshed successfully");
    }

    // Reload the page to ensure fresh data
    setTimeout(() => {
      window.location.reload();
    }, 1000);
    
  } catch (error) {
    console.error("Error refreshing user data:", error);
    // Still reload the page
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  }
};
