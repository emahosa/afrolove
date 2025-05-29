
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
    console.log('Suno callback received:', JSON.stringify(callbackData, null, 2))

    if (callbackData.code !== 200) {
      console.error('Suno callback error:', callbackData.msg)
      return new Response(JSON.stringify({ error: callbackData.msg }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      })
    }

    const { task_id, data: tracks } = callbackData.data

    if (!tracks || tracks.length === 0) {
      console.error('No tracks in callback data for task:', task_id)
      return new Response(JSON.stringify({ error: 'No tracks received' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      })
    }

    console.log(`Processing ${tracks.length} tracks for task: ${task_id}`)

    // Process each track (usually 1-2 tracks)
    for (const track of tracks) {
      console.log('Processing track:', track.id, 'Title:', track.title, 'Audio URL:', track.audio_url)

      // First check if this is for a custom song request
      const { data: existingAudio, error: findCustomError } = await supabase
        .from('custom_song_audio')
        .select('*')
        .eq('audio_url', `task_pending:${task_id}`)
        .maybeSingle()

      if (existingAudio) {
        console.log('Found custom song audio record, updating...')
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
        // Check if this is a general song generation - try exact match first
        console.log('Looking for pending song with exact task ID match...')
        const { data: pendingSong, error: findSongError } = await supabase
          .from('songs')
          .select('*')
          .eq('audio_url', `task_pending:${task_id}`)
          .maybeSingle()

        if (!pendingSong) {
          // Try with LIKE pattern as fallback
          console.log('Exact match failed, trying LIKE pattern...')
          const { data: pendingSongLike, error: findSongLikeError } = await supabase
            .from('songs')
            .select('*')
            .like('audio_url', `task_pending:${task_id}%`)
            .maybeSingle()
          
          if (pendingSongLike) {
            console.log('Found pending song with LIKE pattern:', pendingSongLike.id)
            await updateSongRecord(supabase, pendingSongLike, track)
          } else {
            console.error('No pending song found for task:', task_id)
            // Log all pending songs for debugging
            const { data: allPending } = await supabase
              .from('songs')
              .select('id, audio_url, user_id, title')
              .like('audio_url', 'task_pending:%')
              .order('created_at', { ascending: false })
              .limit(10)
            
            console.log('Recent pending songs:', allPending)
          }
        } else {
          console.log('Found pending song with exact match:', pendingSong.id)
          await updateSongRecord(supabase, pendingSong, track)
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

async function updateSongRecord(supabase: any, pendingSong: any, track: any) {
  try {
    console.log('Updating song record:', pendingSong.id, 'for user:', pendingSong.user_id)
    
    const { error: updateSongError } = await supabase
      .from('songs')
      .update({
        title: track.title || pendingSong.title,
        audio_url: track.audio_url,
        status: 'approved',
        updated_at: new Date().toISOString()
      })
      .eq('id', pendingSong.id)

    if (updateSongError) {
      console.error('Error updating song record:', updateSongError)
      throw updateSongError
    } else {
      console.log('Successfully updated song record:', pendingSong.id)
    }
  } catch (error) {
    console.error('Failed to update song record:', error)
    throw error
  }
}
