
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Helper to log errors to the new table
const logError = async (supabase: ReturnType<typeof createClient>, message: string, context: string, error?: unknown, details?: object) => {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    console.error(`[${context}] ${message}`, errorObj, details);
    
    await supabase.from('error_logs').insert({
        level: 'error',
        message,
        context: `suno-webhook: ${context}`,
        stack_trace: errorObj.stack,
        details: { ...(details || {}), errorMessage: errorObj.message },
    });
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const payload = await req.json()
    
    console.log('🔔 WEBHOOK PAYLOAD RECEIVED:', JSON.stringify(payload, null, 2))

    // Handle failed generations or invalid payloads
    if (payload.code !== 200 || !payload.data) {
        const errorMsg = 'Webhook received non-successful payload or no data';
        await logError(supabase, errorMsg, 'invalid_payload', new Error(payload.msg), payload);
        
        // Attempt to find task_id to update status to rejected
        const taskId = payload?.data?.task_id;
        if (taskId) {
            await supabase
                .from('songs')
                .update({ 
                    status: 'rejected', 
                    error_message: payload.msg || 'Generation failed: Invalid payload from webhook.',
                    updated_at: new Date().toISOString() 
                })
                .eq('task_id', taskId)
                .eq('status', 'pending');
        }
        
        return new Response(JSON.stringify({ error: 'Invalid payload' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { task_id, data: songDataArray, callbackType } = payload.data;

    if (!task_id) {
      const errorMsg = 'NO TASK ID FOUND in webhook payload';
      await logError(supabase, errorMsg, 'missing_task_id', undefined, payload.data);
      return new Response(JSON.stringify({ error: 'Task ID missing' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // We only process the final 'complete' callback for saving songs.
    if (callbackType !== 'complete') {
      console.log(`⏳ Ignoring intermediate callback type: "${callbackType}" for task ${task_id}`);
      return new Response(JSON.stringify({ message: 'Intermediate status, no update needed.' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // If callback is 'complete' but there's no song data, it's a failure.
    if (!songDataArray || songDataArray.length === 0) {
      console.log(`❌ No song data in 'complete' payload for task ${task_id}. Marking as rejected.`);
      await supabase
        .from('songs')
        .update({ 
          status: 'rejected', 
          error_message: payload.msg || 'Generation failed: No song data in completion webhook.',
          updated_at: new Date().toISOString() 
        })
        .eq('task_id', task_id)
        .eq('status', 'pending');
      
      return new Response(JSON.stringify({ success: true, message: 'Handled empty/failed payload.' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    
    // Find the original "pending" song entry that initiated this task
    const { data: originalSong, error: findError } = await supabase
      .from('songs')
      .select('*')
      .eq('task_id', task_id)
      .eq('status', 'pending')
      .limit(1)
      .single()

    if (findError || !originalSong) {
      const errorMsg = 'Original pending song for task ID not found or already processed';
      await logError(supabase, errorMsg, 'find_original_song_failed', findError, { task_id });
      return new Response(JSON.stringify({ error: errorMsg }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    console.log(`✅ Found original song request: ${originalSong.id} for task: ${task_id}`);

    // The first song from the API response will update the original DB entry
    const firstSongData = songDataArray[0];
    const updateData = {
      status: 'completed',
      suno_id: firstSongData.id,
      audio_url: firstSongData.audio_url,
      title: firstSongData.title || originalSong.title,
      lyrics: firstSongData.prompt, // As per docs, prompt contains lyrics
      image_url: firstSongData.image_url,
      duration: firstSongData.duration,
      tags: firstSongData.tags,
      model_name: firstSongData.model_name,
      updated_at: new Date().toISOString(),
      error_message: null
    };

    const { error: updateError } = await supabase
      .from('songs')
      .update(updateData)
      .eq('id', originalSong.id)

    if (updateError) {
      const errorMsg = `FAILED TO UPDATE first song (${originalSong.id})`;
      await logError(supabase, errorMsg, 'update_first_song_failed', updateError, { song_id: originalSong.id });
    } else {
      console.log(`🎉 First song UPDATED SUCCESSFULLY for song ID: ${originalSong.id}`);
    }

    // Any subsequent songs from the API response will be inserted as new DB entries
    if (songDataArray.length > 1) {
      const newSongsToInsert = songDataArray.slice(1).map(songData => ({
        user_id: originalSong.user_id,
        prompt: originalSong.prompt,
        credits_used: 0, // Only charge credits for the first song record
        type: originalSong.type,
        genre_id: originalSong.genre_id,
        status: 'completed',
        task_id: task_id,
        suno_id: songData.id,
        audio_url: songData.audio_url,
        title: songData.title || originalSong.title,
        lyrics: songData.prompt,
        image_url: songData.image_url,
        duration: songData.duration,
        tags: songData.tags,
        model_name: songData.model_name,
        error_message: null
      }));

      const { error: insertError } = await supabase
        .from('songs')
        .insert(newSongsToInsert);

      if (insertError) {
        const errorMsg = `FAILED TO INSERT ${newSongsToInsert.length} subsequent songs`;
        await logError(supabase, errorMsg, 'insert_subsequent_songs_failed', insertError, { task_id });
      } else {
        console.log(`🎉 ${newSongsToInsert.length} subsequent songs INSERTED SUCCESSFULLY for task ID: ${task_id}`);
      }
    }
    
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error) {
    // We need to create a client instance here again for the catch block
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    await logError(supabase, 'Critical webhook error', 'main_catch_block', error, { request_method: req.method });
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
