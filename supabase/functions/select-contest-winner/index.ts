import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { data: contests, error: contestError } = await supabaseAdmin
      .from('contests')
      .select('id, title')
      .lt('end_date', new Date().toISOString())
      .eq('status', 'active');

    if (contestError) {
      throw contestError;
    }

    if (!contests || contests.length === 0) {
      return new Response(JSON.stringify({ message: 'No contests ended.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    for (const contest of contests) {
      const { data: topEntries, error: entriesError } = await supabaseAdmin
        .from('contest_entries')
        .select('id, user_id, vote_count')
        .eq('contest_id', contest.id)
        .order('vote_count', { ascending: false })
        .limit(1);

      if (entriesError) {
        console.error(`Error fetching entries for contest ${contest.id}:`, entriesError);
        continue;
      }

      if (!topEntries || topEntries.length === 0) {
        // No entries, just mark the contest as completed
        await supabaseAdmin
          .from('contests')
          .update({ status: 'completed' })
          .eq('id', contest.id);
        continue;
      }

      const maxVotes = topEntries[0].vote_count;

      const { data: winners, error: winnersError } = await supabaseAdmin
        .from('contest_entries')
        .select('id, user_id')
        .eq('contest_id', contest.id)
        .eq('vote_count', maxVotes);

      if (winnersError) {
        console.error(`Error fetching winners for contest ${contest.id}:`, winnersError);
        continue;
      }

      if (winners && winners.length > 0) {
        const winnerInserts = winners.map(winner => ({
          contest_id: contest.id,
          user_id: winner.user_id,
          contest_entry_id: winner.id,
          rank: 1,
        }));

        await supabaseAdmin.from('contest_winners').insert(winnerInserts);
      }

      await supabaseAdmin
        .from('contests')
        .update({ status: 'completed' })
        .eq('id', contest.id);
    }

    return new Response(JSON.stringify({ message: 'Contest winners selected successfully.' }), {
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
