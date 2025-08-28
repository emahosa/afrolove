import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// Define the shape of the data we want to return to the client.
// This ensures we don't accidentally leak secret keys.
interface ClientPaymentGatewaySettings {
  enabled: boolean;
  activeGateway: 'stripe' | 'paystack';
  stripe: {
    publicKey: string;
  };
  paystack: {
    publicKey: string;
  };
}

// Define a default state for when settings are not configured.
const defaultSettings: ClientPaymentGatewaySettings = {
  enabled: false,
  activeGateway: 'stripe',
  stripe: {
    publicKey: '',
  },
  paystack: {
    publicKey: '',
  },
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (_req) => {
  // Immediately handle OPTIONS preflight requests.
  if (_req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create a Supabase client with the service role key to bypass RLS.
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { data, error } = await supabaseService
      .from('system_settings')
      .select('value')
      .eq('key', 'payment_gateway_settings')
      .single();

    // If no settings row is found, it's not a server error.
    // We'll just return the safe, default (disabled) settings.
    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    if (data?.value) {
      const dbSettings = data.value as Partial<ClientPaymentGatewaySettings>;

      // Carefully construct the client-safe object.
      const clientSettings: ClientPaymentGatewaySettings = {
        enabled: dbSettings.enabled ?? false,
        activeGateway: dbSettings.activeGateway ?? 'stripe',
        stripe: {
          publicKey: dbSettings.stripe?.publicKey ?? '',
        },
        paystack: {
          publicKey: dbSettings.paystack?.publicKey ?? '',
        },
      };

      return new Response(JSON.stringify(clientSettings), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } else {
      // No settings found in DB, return the default (disabled) state.
      return new Response(JSON.stringify(defaultSettings), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
  } catch (error) {
    console.error("Error fetching payment settings:", error);
    return new Response(JSON.stringify({ error: "Could not fetch payment settings" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
