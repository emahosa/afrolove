
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

    // Handle failed generations or invalid payloads
    if (payload.code !== 200 || !payload.data) {
        console.error('❌ Webhook received non-successful payload or no data:', payload.msg);
        
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
      console.error('❌ NO TASK ID FOUND in webhook payload');
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
      console.error('❌ Original pending song for task ID not found:', task_id, findError);
      return new Response(JSON.stringify({ error: 'Original song request not found or already processed' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    console.log(`✅ Found original song request: ${originalSong.id} for task: ${task_id}`);

    // The first song from the API response will update the original DB entry
    const firstSongData = songDataArray[0];

    // Determine the best title
    let chosenTitle = originalSong.title; // User's title from generation step (could be "Generating...")
    const sunoProvidedTitle = firstSongData.title;

    // If originalSong.title was the default "Generating..." or empty, consider Suno's title
    if (!chosenTitle || chosenTitle.trim().toLowerCase() === 'generating...') {
      if (sunoProvidedTitle && !sunoProvidedTitle.startsWith('snd_')) { // Use Suno's title if it's not an ID
        chosenTitle = sunoProvidedTitle;
      } else {
        // Suno's title is an ID or empty, and user's was "Generating..."
        // Fallback to a generic title using part of the original song ID or prompt
        if (originalSong.prompt && originalSong.prompt.length > 0 && originalSong.prompt.length < 50) {
          chosenTitle = originalSong.prompt.split(/[,.!?]/)[0].trim(); // First sentence/phrase of prompt
        } else {
          chosenTitle = `Song by ${originalSong.user_id.substring(0, 8)}`;
        }
        // If still nothing, a final fallback
        if (!chosenTitle || chosenTitle.trim() === '') {
            chosenTitle = `MelodyVerse Creation ${originalSong.id.substring(0,6)}`;
        }
      }
    } else {
      // User provided a custom title. Check if Suno provided a non-ID title that might be better.
      // This part is subjective. For now, let's assume user's custom title is preferred
      // unless Suno provides a clearly better, non-ID title.
      // If Suno's title is an ID, definitely stick with user's custom title.
      if (sunoProvidedTitle && !sunoProvidedTitle.startsWith('snd_') && sunoProvidedTitle !== chosenTitle) {
        // Potentially append Suno's title if it's different and not an ID, or choose one.
        // For simplicity here, if user provided a good title, we stick with it.
        // If Suno's title is substantially different and not an ID, it could be an alternative version.
        // This area might need more nuanced logic based on product requirements.
      }
    }

    // Ensure title is not excessively long
    chosenTitle = chosenTitle.substring(0, 255);


    const updateData = {
      status: 'completed',
      suno_id: firstSongData.id,
      audio_url: firstSongData.audio_url,
      title: chosenTitle,
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
      console.error(`❌ FAILED TO UPDATE first song (${originalSong.id}):`, updateError);
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
        console.error(`❌ FAILED TO INSERT ${newSongsToInsert.length} subsequent songs:`, insertError);
      } else {
        console.log(`🎉 ${newSongsToInsert.length} subsequent songs INSERTED SUCCESSFULLY for task ID: ${task_id}`);
      }
    }
    
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error) {
    console.error('❌ CRITICAL WEBHOOK ERROR:', error.message, error.stack);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
