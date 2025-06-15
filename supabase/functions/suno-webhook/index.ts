import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const payload = await req.json()
    
    console.log('🔔 WEBHOOK PAYLOAD RECEIVED:', JSON.stringify(payload, null, 2))

    // Simplified data extraction logic
    const taskData = Array.isArray(payload) ? payload[0] : payload;
    
    const taskId = taskData.id || taskData.task_id; // Support both id and task_id for robustness
    const status = taskData.status;
    const audioUrl = taskData.audio_url;
    const title = taskData.title;
    const lyrics = taskData.lyrics; // CORRECTED: Get lyrics from the root of the payload
    const duration = taskData.metadata?.duration;
    const errorMessage = taskData.error_message || (status === 'failed' ? 'Generation failed' : null);

    console.log('📋 EXTRACTED DATA:', { taskId, status, audioUrl, title, lyrics, duration, errorMessage });

    if (!taskId) {
      console.error('❌ NO TASK ID FOUND in webhook payload');
      return new Response(JSON.stringify({ error: 'Task ID missing' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { data: existingSong, error: findError } = await supabase
      .from('songs')
      .select('id')
      .eq('audio_url', taskId) // Find by task ID stored in audio_url
      .eq('status', 'pending')
      .single()

    if (findError || !existingSong) {
      console.error('❌ Song with pending status and task ID not found:', taskId, findError);
      return new Response(JSON.stringify({ error: 'Song not found or already processed' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    console.log(`✅ FOUND SONG: ${existingSong.id} for task: ${taskId}`)

    let updateData: any = { updated_at: new Date().toISOString() };

    if (status === 'completed' || status === 'complete') {
      updateData.status = 'completed';
      updateData.audio_url = audioUrl;
      updateData.title = title || 'Untitled Song';
      updateData.lyrics = lyrics;
      updateData.duration = duration;
      console.log('✅ MARKING SONG AS COMPLETED');
    } else if (status === 'failed' || status === 'error') {
      updateData.status = 'rejected';
      updateData.audio_url = `error: ${errorMessage || 'Generation failed'}`;
      console.log('❌ MARKING SONG AS FAILED');
    } else {
      console.log(`⏳ Ignoring intermediate status: ${status}`);
      return new Response(JSON.stringify({ message: 'Intermediate status, no update needed.' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { error: updateError } = await supabase
      .from('songs')
      .update(updateData)
      .eq('id', existingSong.id)

    if (updateError) {
      console.error('❌ FAILED TO UPDATE SONG:', updateError);
      return new Response(JSON.stringify({ error: 'Database update failed' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    console.log('🎉 SONG UPDATED SUCCESSFULLY via webhook for song ID:', existingSong.id);
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error) {
    console.error('❌ CRITICAL WEBHOOK ERROR:', error.message, error.stack);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
