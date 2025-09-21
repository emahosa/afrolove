import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.36.0";

// Supabase client with service role key
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  try {
    const body = await req.json();
    const { event, data } = body;

    // Only handle successful charges
    if (event === "charge.completed" && data.status === "successful") {
      const { id: transactionId, amount, currency, customer, meta } = data;
      const userId = meta.user_id;
      const paymentType = meta.type;

      // ✅ Idempotency check: skip if transaction already exists
      const { data: existingTx, error: fetchError } = await supabase
        .from("payment_transactions")
        .select("id")
        .eq("transaction_id", transactionId)
        .single();

      if (fetchError && fetchError.code !== "PGRST116") { // Ignore "no rows" error
        console.error("Error checking existing transaction:", fetchError);
        return new Response(JSON.stringify({ status: "error", error: fetchError.message }), { status: 500 });
      }

      if (existingTx) {
        console.log(`Transaction ${transactionId} already processed. Ignoring duplicate.`);
        return new Response(JSON.stringify({ status: "ignored", reason: "duplicate transaction" }), { status: 200 });
      }

      // Insert payment transaction
      const { error: insertError } = await supabase
        .from("payment_transactions")
        .insert({
          transaction_id: transactionId,
          user_id: userId,
          type: paymentType,
          plan_id: meta.plan_id ?? null,
          plan_name: meta.plan_name ?? null,
          credits: meta.credits ?? null,
          amount,
          currency,
          status: "success",
          gateway: "flutterwave",
        });

      if (insertError) {
        console.error("Error inserting payment:", insertError);
        return new Response(JSON.stringify({ status: "error", error: insertError.message }), { status: 500 });
      }

      console.log(`Payment ${transactionId} recorded successfully`);

      // Handle credits purchase
      if (paymentType === "credits" && meta.credits) {
        const { error: creditsError } = await supabase.rpc("update_user_credits", {
          p_user_id: userId,
          p_amount: meta.credits,
        });

        if (creditsError) {
          console.error("Error updating user credits:", creditsError);
          return new Response(JSON.stringify({ status: "error", error: creditsError.message }), { status: 500 });
        }

        console.log(`User ${userId} credits updated by ${meta.credits}`);
      }

      // Handle subscription purchase or upgrade
      if (paymentType === "subscription" && meta.plan_id) {
        const { error: subscriptionError } = await supabase
          .from("profiles")
          .update({
            subscription_plan_id: meta.plan_id,
            subscription_plan_name: meta.plan_name,
            subscription_status: "active",
          })
          .eq("id", userId);

        if (subscriptionError) {
          console.error("Error updating subscription:", subscriptionError);
          return new Response(JSON.stringify({ status: "error", error: subscriptionError.message }), { status: 500 });
        }

        console.log(`User ${userId} subscription updated to plan ${meta.plan_name}`);
      }

      return new Response(JSON.stringify({ status: "success" }), { status: 200 });
    }

    // Ignore other events
    return new Response(JSON.stringify({ status: "ignored" }), { status: 200 });
  } catch (err) {
    console.error("Webhook processing failed:", err);
    return new Response(JSON.stringify({ status: "error", error: err.message }), { status: 500 });
  }
});
