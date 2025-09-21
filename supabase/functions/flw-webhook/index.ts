import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const FLW_SECRET_HASH = Deno.env.get("FLW_SECRET_HASH")!;
const FLW_SECRET_KEY = Deno.env.get("FLW_SECRET_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('🔔 Flutterwave Webhook: Request received');
    
    const signature = req.headers.get("verif-hash");
    console.log('🔐 Flutterwave Webhook: Signature check:', !!signature);
    
    if (!signature || signature !== FLW_SECRET_HASH) {
      console.error('❌ Flutterwave Webhook: Invalid signature');
      return new Response("Invalid signature", { status: 401, headers: corsHeaders });
    }

    const payload = await req.json();
    console.log('📥 Flutterwave Webhook: Payload received:', JSON.stringify(payload, null, 2));

    if (payload.event === 'charge.completed' && payload.data.status === 'successful') {
      const chargeData = payload.data;
      const { id, amount, currency, tx_ref } = chargeData;
      const meta = chargeData.meta || chargeData.metadata || {};
      
      console.log('📋 Flutterwave Webhook: Charge data:', { id, amount, currency, tx_ref });
      console.log('📋 Flutterwave Webhook: Metadata:', meta);
      
      const { user_id, type, credits, plan_id, plan_name, user_email } = meta;

      if (!user_id) {
        console.error('❌ Flutterwave Webhook: No user_id in event metadata', meta);
        return new Response('No user_id in metadata', { status: 400, headers: corsHeaders });
      }

      if (!type) {
        console.error('❌ Flutterwave Webhook: No type in event metadata', meta);
        return new Response('No type in metadata', { status: 400, headers: corsHeaders });
      }

      const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      console.log('🔍 Flutterwave Webhook: Verifying transaction with Flutterwave API...');
      
      const verifyRes = await fetch(`https://api.flutterwave.com/v3/transactions/${id}/verify`, {
        headers: { Authorization: `Bearer ${FLW_SECRET_KEY}` },
      });
      
      if (!verifyRes.ok) {
        console.error('❌ Flutterwave Webhook: API verification failed:', verifyRes.status);
        return new Response(JSON.stringify({ error: 'API verification failed' }), { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
      }
      
      const verificationData = await verifyRes.json();
      console.log('📥 Flutterwave Webhook: Verification response:', verificationData);

      if (verificationData.status !== 'success' || verificationData.data.status !== 'successful') {
        console.warn(`⚠️ Flutterwave Webhook: Verification failed for transaction ${id}. Status: ${verificationData.data?.status}`);
        return new Response(JSON.stringify({ 
          received: true, 
          message: "Verification failed" 
        }), { 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
      }

      // Check if transaction already processed
      console.log('🔍 Flutterwave Webhook: Checking for existing transaction...');
      const { data: existingTx } = await supabaseAdmin
        .from('payment_transactions')
        .select('id')
        .eq('payment_id', id)
        .single();

      if (existingTx) {
        console.log(`⚠️ Flutterwave Webhook: Transaction ${id} already processed.`);
        return new Response(JSON.stringify({ 
          received: true, 
          message: "Already processed" 
        }), { 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
      }

      console.log('💾 Flutterwave Webhook: Recording transaction...');
      const { error: transactionError } = await supabaseAdmin
        .from('payment_transactions')
        .insert({
          user_id: user_id,
          amount: verificationData.data.amount,
          currency: currency?.toUpperCase() || 'USD',
          payment_method: 'flutterwave',
          status: 'completed',
          payment_id: id,
          credits_purchased: type === 'credits' ? parseInt(credits || '0') : 0
        });

      if (transactionError) {
        console.error('❌ Flutterwave Webhook: Error logging transaction:', transactionError);
      } else {
        console.log('✅ Flutterwave Webhook: Transaction logged successfully');
      }

      // Process credits
      if (type === 'credits' && credits) {
        console.log(`💳 Flutterwave Webhook: Processing ${credits} credits for user ${user_id}`);
        
        const { error: creditError } = await supabaseAdmin.rpc('update_user_credits', {
          p_user_id: user_id,
          p_amount: parseInt(credits)
        });
        
        if (creditError) {
          console.error('❌ Flutterwave Webhook: Error updating credits:', creditError);
        } else {
          console.log('✅ Flutterwave Webhook: Credits updated successfully');
        }
      }

      // Process subscription
      if (type === 'subscription' && plan_id && plan_name) {
        console.log(`📋 Flutterwave Webhook: Processing subscription for user ${user_id}, plan: ${plan_name}`);
        
        const subscriptionStartDate = new Date(verificationData.data.created_at);
        const expiresAt = new Date(subscriptionStartDate);
        expiresAt.setMonth(expiresAt.getMonth() + 1);

        // Deactivate existing subscriptions
        console.log('🔄 Flutterwave Webhook: Deactivating existing subscriptions...');
        await supabaseAdmin
          .from('user_subscriptions')
          .update({ subscription_status: 'inactive', updated_at: new Date().toISOString() })
          .eq('user_id', user_id)
          .eq('subscription_status', 'active');

        // Create new subscription
        console.log('📋 Flutterwave Webhook: Creating new subscription...');
        const { error: subError } = await supabaseAdmin
          .from('user_subscriptions')
          .upsert({
            user_id: user_id,
            subscription_type: plan_id,
            subscription_status: 'active',
            started_at: subscriptionStartDate.toISOString(),
            expires_at: expiresAt.toISOString(),
            updated_at: new Date().toISOString(),
            payment_provider: 'flutterwave'
          }, { onConflict: 'user_id' });

        if (subError) {
          console.error('❌ Flutterwave Webhook: Error upserting subscription:', subError);
        } else {
          console.log('✅ Flutterwave Webhook: Subscription created successfully');
        }

        // Award subscription credits
        if (credits) {
          console.log(`💰 Flutterwave Webhook: Adding ${credits} credits for subscription`);
          
          const { error: creditError } = await supabaseAdmin.rpc('update_user_credits', {
            p_user_id: user_id,
            p_amount: parseInt(credits)
          });
          
          if (creditError) {
            console.error('❌ Flutterwave Webhook: Error adding credits for subscription:', creditError);
          } else {
            console.log('✅ Flutterwave Webhook: Subscription credits added successfully');
          }
        }
        
        // Update user roles
        console.log('🔄 Flutterwave Webhook: Updating user roles...');
        
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
          console.error('⚠️ Flutterwave Webhook: Error updating user role:', roleError);
        } else {
          console.log('✅ Flutterwave Webhook: User role updated to subscriber');
        }
      }
    } else {
      console.log('ℹ️ Flutterwave Webhook: Event not relevant for processing:', payload.event);
    }

    console.log('🎉 Flutterwave Webhook: Processing completed successfully');
    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (err: any) {
    console.error('💥 Flutterwave Webhook: Uncaught error:', err);
    return new Response(`Webhook error: ${err.message}`, {
      status: 500,
      headers: corsHeaders,
    });
  }
});