import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { year, month } = await req.json();
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    // Check if the user is an admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }

    // Fetch data for the report
    const startDate = new Date(year, month - 1, 1).toISOString();
    const endDate = new Date(year, month, 0).toISOString();

    const [
      { count: totalUsers },
      { data: revenueData },
      { count: totalSongs },
      { count: contestEntries },
      { data: activeUsersData },
      { count: supportTickets }
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }).lte('created_at', endDate),
      supabase.from('payment_transactions').select('amount').eq('status', 'completed').gte('created_at', startDate).lte('created_at', endDate),
      supabase.from('songs').select('*', { count: 'exact', head: true }).gte('created_at', startDate).lte('created_at', endDate),
      supabase.from('contest_entries').select('*', { count: 'exact', head: true }).gte('created_at', startDate).lte('created_at', endDate),
      supabase.from('songs').select('user_id', { count: 'exact' }).gte('created_at', startDate).lte('created_at', endDate),
      supabase.from('support_tickets').select('*', { count: 'exact', head: true }).gte('created_at', startDate).lte('created_at', endDate),
    ]);

    const totalRevenue = revenueData?.reduce((sum, transaction) => sum + Number(transaction.amount), 0) || 0;
    const activeUsers = new Set(activeUsersData?.map(song => song.user_id) || []).size;

    const reportData = [
      ['Metric', 'Value'],
      ['Year', year],
      ['Month', month],
      ['Total Users', totalUsers],
      ['Total Revenue', `$${totalRevenue.toFixed(2)}`],
      ['Songs Generated', totalSongs],
      ['Contest Entries', contestEntries],
      ['Active Users', activeUsers],
      ['Support Tickets', supportTickets],
    ];

    const csvContent = reportData.map(e => e.join(',')).join('\n');

    return new Response(csvContent, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="monthly_report_${year}_${month}.csv"`,
      },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
