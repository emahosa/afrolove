import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // 1. Get the exchange rate from settings
    const { data: settingsData, error: settingsError } = await supabaseService
      .from('system_settings')
      .select('value')
      .eq('key', 'currency')
      .single();

    if (settingsError) throw new Error(`Error fetching exchange rate: ${settingsError.message}`);

    const exchangeRate = settingsData?.value?.usd_to_ngn;
    if (!exchangeRate || typeof exchangeRate !== 'number') {
      throw new Error('Invalid or missing exchange rate in system_settings');
    }

    // 2. Update plans
    const { data: plans, error: plansError } = await supabaseService
      .from('plans')
      .select('id, price');

    if (plansError) throw new Error(`Error fetching plans: ${plansError.message}`);

    if (plans) {
      for (const plan of plans) {
        const priceNgn = plan.price * exchangeRate;
        await supabaseService
          .from('plans')
          .update({ price_ngn: priceNgn, exchange_rate: exchangeRate })
          .eq('id', plan.id);
      }
    }

    // 3. Update credit_packages
    const { data: packages, error: packagesError } = await supabaseService
      .from('credit_packages')
      .select('id, price');

    if (packagesError) throw new Error(`Error fetching credit packages: ${packagesError.message}`);

    if (packages) {
      for (const pkg of packages) {
        const priceNgn = pkg.price * exchangeRate;
        await supabaseService
          .from('credit_packages')
          .update({ price_ngn: priceNgn, exchange_rate: exchangeRate })
          .eq('id', pkg.id);
      }
    }

    return new Response(JSON.stringify({ message: 'Prices updated successfully' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
