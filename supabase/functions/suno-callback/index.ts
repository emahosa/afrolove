
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

      // Find existing pending audio record
      const { data: existingAudio, error: findError } = await supabase
        .from('custom_song_audio')
        .select('*')
        .like('audio_url', `task_pending:${task_id}%`)
        .single()

      if (findError) {
        console.error('Error finding pending audio record:', findError)
        continue
      }

      if (existingAudio) {
        // Update existing record with actual audio URL
        const { error: updateError } = await supabase
          .from('custom_song_audio')
          .update({
            audio_url: track.audio_url,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingAudio.id)

        if (updateError) {
          console.error('Error updating audio record:', updateError)
        } else {
          console.log('Updated audio record for request:', existingAudio.request_id)

          // Update the request status to audio_uploaded if not already completed
          const { error: statusError } = await supabase
            .from('custom_song_requests')
            .update({ 
              status: 'audio_uploaded',
              updated_at: new Date().toISOString()
            })
            .eq('id', existingAudio.request_id)
            .not('status', 'eq', 'completed')

          if (statusError) {
            console.error('Error updating request status:', statusError)
          }
        }
      } else {
        // Create new song record for general AI generation (not custom requests)
        console.log('Creating new song record for general generation')
        
        // Try to find the user who initiated this task (we'll need to store task_id with user_id)
        // For now, we'll create a general song record
        const { error: insertError } = await supabase
          .from('songs')
          .insert({
            title: track.title,
            audio_url: track.audio_url,
            lyrics: track.prompt,
            type: 'song',
            user_id: '00000000-0000-0000-0000-000000000000', // Default user - this should be improved
            status: 'completed',
            credits_used: 5
          })

        if (insertError) {
          console.error('Error creating song record:', insertError)
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
