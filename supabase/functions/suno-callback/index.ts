
import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SunoCallback {
  code: number;
  msg: string;
  data: {
    callbackType: string;
    task_id: string;
    data: Array<{
      id: string;
      audio_url: string;
      stream_audio_url: string;
      image_url: string;
      title: string;
      prompt: string;
      model_name: string;
      duration: number;
      status?: string;
    }>;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const callbackData: SunoCallback = await req.json()
    console.log('Received Suno callback:', callbackData)

    if (callbackData.code !== 200) {
      console.error('Suno callback error:', callbackData.msg)
      return new Response(JSON.stringify({ error: callbackData.msg }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      })
    }

    const { task_id, data: tracks } = callbackData.data

    if (!tracks || tracks.length === 0) {
      console.error('No tracks in callback data')
      return new Response(JSON.stringify({ error: 'No tracks received' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      })
    }

    // Process each track (usually 1-2 tracks)
    for (const track of tracks) {
      console.log('Processing track:', track.id, track.title)

      // First check if this is for a custom song request
      const { data: existingAudio, error: findCustomError } = await supabase
        .from('custom_song_audio')
        .select('*')
        .like('audio_url', `task_pending:${task_id}%`)
        .maybeSingle()

      if (existingAudio) {
        // Update custom song audio record
        const { error: updateError } = await supabase
          .from('custom_song_audio')
          .update({
            audio_url: track.audio_url,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingAudio.id)

        if (updateError) {
          console.error('Error updating custom audio record:', updateError)
        } else {
          console.log('Updated custom audio record for request:', existingAudio.request_id)

          // Update the request status
          await supabase
            .from('custom_song_requests')
            .update({ 
              status: 'audio_uploaded',
              updated_at: new Date().toISOString()
            })
            .eq('id', existingAudio.request_id)
        }
      } else {
        // Check if this is a general song generation
        const { data: pendingSong, error: findSongError } = await supabase
          .from('songs')
          .select('*')
          .like('audio_url', `task_pending:${task_id}%`)
          .maybeSingle()

        if (pendingSong) {
          // Update the pending song with actual audio URL
          const { error: updateSongError } = await supabase
            .from('songs')
            .update({
              title: track.title || pendingSong.title,
              audio_url: track.audio_url,
              status: 'completed',
              updated_at: new Date().toISOString()
            })
            .eq('id', pendingSong.id)

          if (updateSongError) {
            console.error('Error updating song record:', updateSongError)
          } else {
            console.log('Updated song record:', pendingSong.id, 'for user:', pendingSong.user_id)
          }
        } else {
          console.log('No pending song found for task:', task_id)
          // This shouldn't happen with the new flow, but log it for debugging
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Callback processed successfully' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error in suno-callback:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Callback processing failed' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
