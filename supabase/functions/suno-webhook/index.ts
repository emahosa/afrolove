
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
    console.log('🔔 WEBHOOK CALLED - Method:', req.method)
    console.log('🔔 WEBHOOK CALLED - URL:', req.url)
    console.log('🔔 WEBHOOK CALLED - Headers:', JSON.stringify([...req.headers.entries()], null, 2))
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    const payload = await req.json()
    console.log('🔔 WEBHOOK PAYLOAD RECEIVED:', JSON.stringify(payload, null, 2))

    // Handle different callback structures from Suno
    let taskId = null;
    let audioUrl = null;
    let status = 'pending'; // Default status
    let title = null;
    let errorMessage = null;

    // More robust extraction logic
    if (payload.data?.task_id) { // Structure: { data: { task_id, data: [...] } }
      taskId = payload.data.task_id;
      if (payload.data.data && Array.isArray(payload.data.data) && payload.data.data.length > 0) {
        const track = payload.data.data[0];
        audioUrl = track.audio_url || track.audioUrl;
        title = track.title;
        // Suno callback for "complete" means it was successful.
        if (payload.data.callbackType === 'complete' || track.status === 'SUCCESS' || track.status === 'completed') {
            status = 'completed';
        } else if (track.status === 'failed' || track.status === 'FAIL' || track.status === 'error') {
            status = 'failed';
            errorMessage = track.error_message || 'Generation failed';
        }
        console.log('📋 Extracted from nested data structure');
      }
    } else if (payload.id) { // Fallback for root object structure: { id, audio_url, ... }
        taskId = payload.id;
        audioUrl = payload.audio_url || payload.audioUrl;
        status = payload.status;
        title = payload.title;
        console.log('📋 Extracted from root object structure');
    }
    
    // Final check for failure status at payload root
    if (payload.status === 'FAIL' || payload.status === 'failed' || payload.status === 'error') {
      status = 'failed';
      errorMessage = payload.error_message || payload.message || 'Generation failed';
    }

    console.log('📋 EXTRACTED DATA:', { taskId, audioUrl, status, title, errorMessage });

    if (!taskId) {
      console.error('❌ NO TASK ID FOUND in webhook payload')
      console.log('❌ Available keys in payload:', Object.keys(payload))
      return new Response(JSON.stringify({ 
        error: 'No task ID found in webhook',
        received: payload,
        available_keys: Object.keys(payload)
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Find the song with this task ID
    console.log('🔍 SEARCHING for song with task ID:', taskId)
    const { data: existingSong, error: findError } = await supabase
      .from('songs')
      .select('id, title, status, user_id, audio_url, created_at')
      .eq('audio_url', taskId)
      .eq('status', 'pending')
      .single()

    if (findError) {
      console.error('❌ DATABASE ERROR finding song:', findError)
      
      const { data: allSongs } = await supabase
        .from('songs')
        .select('id, title, status, audio_url, created_at')
        .eq('audio_url', taskId)
      
      console.log('🔍 Found songs with this task ID (any status):', JSON.stringify(allSongs, null, 2))
      
      return new Response(JSON.stringify({ 
        error: 'Database error finding song',
        debug: findError,
        found_songs: allSongs
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (!existingSong) {
      console.error('❌ NO SONG FOUND with task ID:', taskId)
      
      const { data: recentSongs } = await supabase
        .from('songs')
        .select('id, title, status, audio_url, created_at')
        .order('created_at', { ascending: false })
        .limit(10)
      
      console.log('📋 Recent songs in database for debugging:', JSON.stringify(recentSongs, null, 2))
      
      return new Response(JSON.stringify({ 
        error: 'Song not found',
        taskId,
        recent_songs: recentSongs
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`✅ FOUND SONG: ${existingSong.id} for task: ${taskId}`)
    console.log('📋 Song details:', JSON.stringify(existingSong, null, 2))

    // Determine the update based on status
    let updateData = {
      updated_at: new Date().toISOString()
    }

    // Check if generation completed successfully
    if (audioUrl && (status === 'SUCCESS' || status === 'completed')) {
      updateData.status = 'completed'
      updateData.audio_url = audioUrl
      
      // Update title if provided and different
      if (title && title !== existingSong.title && title.trim() !== '') {
        updateData.title = title
      }
      
      console.log('✅ MARKING SONG AS COMPLETED with audio URL:', audioUrl)
    }
    // Check if generation failed
    else if (status === 'FAIL' || status === 'failed') {
      updateData.status = 'rejected'
      updateData.audio_url = `error: ${errorMessage || 'Generation failed'}`
      console.log('❌ MARKING SONG AS FAILED')
    }
    // Still processing
    else {
      console.log('⏳ SONG STILL PROCESSING, status:', status, 'No update will be made.')
      // We will return a success response to Suno but not update our DB for intermediate steps.
       return new Response(JSON.stringify({ 
        success: true,
        message: 'Webhook processed for intermediate step, no final update made.',
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('📝 UPDATE DATA:', JSON.stringify(updateData, null, 2))

    // Update the song record
    const { data: updatedSong, error: updateError } = await supabase
      .from('songs')
      .update(updateData)
      .eq('id', existingSong.id)
      .select()

    if (updateError) {
      console.error('❌ FAILED TO UPDATE SONG:', updateError)
      return new Response(JSON.stringify({ 
        error: 'Database update failed',
        details: updateError.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('✅ SONG UPDATED SUCCESSFULLY via webhook:', JSON.stringify(updatedSong, null, 2))
    
    const successResponse = { 
      success: true,
      message: 'Webhook processed successfully',
      song_id: existingSong.id,
      task_id: taskId,
      status: updateData.status || 'processing'
    }
    
    console.log('🎉 RETURNING WEBHOOK SUCCESS:', JSON.stringify(successResponse, null, 2))
    
    return new Response(JSON.stringify(successResponse), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('❌ CRITICAL WEBHOOK ERROR:', error)
    console.error('❌ Error stack:', error.stack)
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

