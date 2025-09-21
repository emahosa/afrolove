import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const FLW_SECRET_KEY = Deno.env.get("FLW_SECRET_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  console.log('🔍 Flutterwave Verify: Request received');
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    console.log('📥 Flutterwave Verify: Request body:', requestBody);
    
    const { transaction_id, tx_ref, type, user_id, credits, plan_id, plan_name, amount } = requestBody;
    
    if (!transaction_id || !tx_ref) {
      console.error('❌ Flutterwave Verify: Missing transaction_id or tx_ref');
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Missing transaction_id or tx_ref" 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!user_id || !type) {
      console.error('❌ Flutterwave Verify: Missing user_id or type in request');
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Missing user_id or type in request body" 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log('🔍 Flutterwave Verify: Verifying transaction with Flutterwave API...');
    
    const verifyRes = await fetch(`https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${FLW_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
    });

    if (!verifyRes.ok) {
      console.error('❌ Flutterwave Verify: API verification failed:', verifyRes.status, verifyRes.statusText);
      return new Response(JSON.stringify({ 
        success: false, 
        error: `Flutterwave API error: ${verifyRes.status}` 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await verifyRes.json();
    console.log('📥 Flutterwave Verify: API response:', result);

    if (result.status !== "success" || result.data.status !== "successful") {
      console.error('❌ Flutterwave Verify: Transaction not successful:', result.data.status);
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Transaction not successful", 
        data: result 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (result.data.tx_ref !== tx_ref) {
      console.error('❌ Flutterwave Verify: tx_ref mismatch');
      return new Response(JSON.stringify({ 
        success: false, 
        error: "tx_ref mismatch" 
      }), { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    console.log('✅ Flutterwave Verify: Transaction verified successfully');

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check if transaction already processed
    const { data: existingTx, error: txCheckError } = await supabaseAdmin
      .from('payment_transactions')
      .select('id')
      .eq('payment_id', transaction_id)
      .single();

    if (txCheckError && txCheckError.code !== 'PGRST116') {
      console.error('❌ Flutterwave Verify: Error checking existing transaction:', txCheckError);
      throw txCheckError;
    }

    if (existingTx) {
      console.log('⚠️ Flutterwave Verify: Transaction already processed');
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Transaction already processed." 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log('💾 Flutterwave Verify: Recording transaction in database...');

    // Record the transaction
    const { error: insertError } = await supabaseAdmin.from('payment_transactions').insert({
      user_id: user_id,
      amount: result.data.amount,
      currency: result.data.currency?.toUpperCase() || 'USD',
      payment_method: 'flutterwave',
      status: 'completed',
      payment_id: transaction_id,
      credits_purchased: type === 'credits' ? parseInt(credits || '0') : 0
    });

    if (insertError) {
      console.error('❌ Flutterwave Verify: Error inserting transaction:', insertError);
    } else {
      console.log('✅ Flutterwave Verify: Transaction recorded successfully');
    }

    // Process credits
    if (type === 'credits' && credits) {
      console.log(`💳 Flutterwave Verify: Adding ${credits} credits to user ${user_id}`);
      
      const { error: creditError } = await supabaseAdmin.rpc('update_user_credits', {
        p_user_id: user_id,
        p_amount: parseInt(credits || '0'),
      });
      
      if (creditError) {
        console.error('❌ Flutterwave Verify: Error updating credits:', creditError);
        throw new Error(`Failed to update user credits: ${creditError.message}`);
      } else {
        console.log('✅ Flutterwave Verify: Credits updated successfully');
      }
    }

    // Process subscription
    if (type === 'subscription' && plan_id && plan_name) {
      console.log(`📋 Flutterwave Verify: Activating subscription for user ${user_id} with plan ${plan_name}`);
      
      const subscriptionStartDate = new Date(result.data.created_at);
      const expiresAt = new Date(subscriptionStartDate);
      expiresAt.setMonth(expiresAt.getMonth() + 1);

      // Deactivate existing subscriptions
      const { error: deactivateError } = await supabaseAdmin
        .from('user_subscriptions')
        .update({ 
          subscription_status: 'inactive', 
          updated_at: new Date().toISOString() 
        })
        .eq('user_id', user_id)
        .eq('subscription_status', 'active');

      if (deactivateError) {
        console.error('⚠️ Flutterwave Verify: Error deactivating existing subscriptions:', deactivateError);
      }

      // Create new subscription
      const subscriptionData = {
        user_id: user_id,
        subscription_type: plan_id,
        subscription_status: 'active',
        started_at: subscriptionStartDate.toISOString(),
        expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
        payment_provider: 'flutterwave'
      };

      const { error: subError } = await supabaseAdmin
        .from('user_subscriptions')
        .upsert(subscriptionData, { onConflict: 'user_id' });

      if (subError) {
        console.error('❌ Flutterwave Verify: Error creating subscription:', subError);
        throw new Error(`Failed to create subscription: ${subError.message}`);
      } else {
        console.log('✅ Flutterwave Verify: Subscription created successfully');
      }

      // Award credits for subscription if applicable
      if (credits && parseInt(credits) > 0) {
        console.log(`💰 Flutterwave Verify: Adding ${credits} credits for subscription`);
        
        const { error: creditError } = await supabaseAdmin.rpc('update_user_credits', {
          p_user_id: user_id,
          p_amount: parseInt(credits)
        });
        
        if (creditError) {
          console.error('❌ Flutterwave Verify: Error adding credits for subscription:', creditError);
        } else {
          console.log('✅ Flutterwave Verify: Subscription credits added successfully');
        }
      }

      // Update user roles - remove voter, add subscriber
      console.log('🔄 Flutterwave Verify: Updating user roles...');
      
      await supabaseAdmin
        .from('user_roles')
        .delete()
        .eq('user_id', user_id)
        .eq('role', 'voter');

      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .upsert({ 
          user_id: user_id, 
          role: 'subscriber' 
        }, { 
          onConflict: 'user_id,role' 
        });

      if (roleError) {
        console.error('⚠️ Flutterwave Verify: Error updating user role:', roleError);
      } else {
        console.log('✅ Flutterwave Verify: User role updated to subscriber');
      }
    }

    console.log('🎉 Flutterwave Verify: Payment processing completed successfully');

    return new Response(JSON.stringify({ 
      success: true,
      message: `${type === 'credits' ? 'Credits' : 'Subscription'} processed successfully`,
      data: result.data 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error('💥 Flutterwave Verify: Uncaught error:', err);
    return new Response(JSON.stringify({ 
      success: false,
      error: err.message || "Internal Server Error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});