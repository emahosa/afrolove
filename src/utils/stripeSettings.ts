import { supabase } from '@/integrations/supabase/client';

interface StripeSettingValue {
  enabled: boolean;
}

export const isStripeEnabled = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'stripe_enabled')
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking Stripe settings:', error);
      return true; // Default to enabled if we can't check
    }

    if (data?.value && typeof data.value === 'object' && data.value !== null && !Array.isArray(data.value)) {
      const settingValue = data.value as { enabled?: boolean };
      return settingValue.enabled === true;
    }

    return true; // Default to enabled if no setting exists
  } catch (error) {
    console.error('Error checking Stripe settings:', error);
    return true; // Default to enabled if we can't check
  }
};

export const processAutomaticPayment = async (userId: string, type: 'credits' | 'subscription', amount: number, credits?: number, planId?: string, planName?: string): Promise<boolean> => {
  try {
    console.log('🔄 Processing automatic payment:', { userId, type, amount, credits, planId });

    if (type === 'credits' && credits) {
      // Automatically add credits without payment
      const { data: newBalance, error: creditError } = await supabase.rpc('update_user_credits', {
        p_user_id: userId,
        p_amount: credits
      });

      if (creditError) {
        console.error('❌ Error updating credits:', creditError);
        return false;
      }

      // Log the transaction
      const { error: transactionError } = await supabase
        .from('payment_transactions')
        .insert({
          user_id: userId,
          amount: amount,
          currency: 'USD',
          payment_method: 'automatic',
          status: 'completed',
          payment_id: `auto-${Date.now()}`,
          credits_purchased: credits
        });

      if (transactionError) {
        console.error('❌ Error logging transaction:', transactionError);
      }

      console.log(`✅ Credits added automatically. New balance: ${newBalance}`);
      return true;
    }

    if (type === 'subscription' && planId && planName) {
      // Automatically activate subscription without payment
      const subscriptionStartDate = new Date();
      const expiresAt = new Date(subscriptionStartDate);
      expiresAt.setMonth(expiresAt.getMonth() + 1);

      // Deactivate existing subscriptions
      await supabase
        .from('user_subscriptions')
        .update({ 
          subscription_status: 'inactive',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('subscription_status', 'active');

      // Create new subscription record
      const { error: subError } = await supabase
        .from('user_subscriptions')
        .insert({
          user_id: userId,
          subscription_type: planId,
          subscription_status: 'active',
          started_at: subscriptionStartDate.toISOString(),
          expires_at: expiresAt.toISOString(),
          stripe_subscription_id: `auto-${Date.now()}`,
          stripe_customer_id: `auto-customer-${userId}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (subError) {
        console.error('❌ Error creating subscription:', subError);
        return false;
      }

      // Update user roles
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', 'voter');

      await supabase
        .from('user_roles')
        .upsert({ 
          user_id: userId, 
          role: 'subscriber' 
        }, { 
          onConflict: 'user_id,role' 
        });

      // Log the transaction
      const { error: transactionError } = await supabase
        .from('payment_transactions')
        .insert({
          user_id: userId,
          amount: amount,
          currency: 'USD',
          payment_method: 'automatic',
          status: 'completed',
          payment_id: `auto-${Date.now()}`,
          credits_purchased: 0
        });

      if (transactionError) {
        console.error('❌ Error logging transaction:', transactionError);
      }

      console.log('✅ Subscription activated automatically');
      return true;
    }

    return false;
  } catch (error) {
    console.error('❌ Error processing automatic payment:', error);
    return false;
  }
};
