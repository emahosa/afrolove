
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
    const body = await req.json()
    
    console.log('Suno Callback received:', JSON.stringify(body, null, 2))

    // Extract task ID and audio data from Suno callback
    const taskId = body?.data?.task_id
    const audioData = body?.data?.data?.[0]

    console.log('Task ID:', taskId)
    console.log('Audio data:', audioData)

    if (!taskId) {
      console.error('No task_id in callback')
      return new Response(JSON.stringify({ error: 'task_id required' }), {
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (!audioData || !audioData.audio_url) {
      console.error('No audio data in callback')
      return new Response(JSON.stringify({ error: 'Invalid callback - no audio data' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Find the song by task ID in the audio_url field
    const { data: songs, error: findError } = await supabase
      .from('songs')
      .select('*')
      .eq('audio_url', `task:${taskId}`)

    if (findError) {
      console.error('Error finding song:', findError)
      return new Response(JSON.stringify({ error: 'Database error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (!songs || songs.length === 0) {
      console.log(`No song found for task: ${taskId}`)
      return new Response(JSON.stringify({ message: 'Song not found', task_id: taskId }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const song = songs[0]
    console.log(`Updating song: ${song.id}`)

    // Update the song with the completed audio data
    const updateData = {
      status: 'completed',
      audio_url: audioData.audio_url,
      lyrics: audioData.prompt || song.lyrics,
      updated_at: new Date().toISOString()
    }

    // Add optional fields if they exist
    if (audioData.stream_audio_url) {
      updateData.instrumental_url = audioData.stream_audio_url
    }
    if (audioData.title && !song.title) {
      updateData.title = audioData.title
    }

    console.log('Updating song with:', updateData)

    const { error: updateError } = await supabase
      .from('songs')
      .update(updateData)
      .eq('id', song.id)

    if (updateError) {
      console.error('Error updating song:', updateError)
      return new Response(JSON.stringify({ error: 'Update failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`✅ Song ${song.id} updated successfully`)

    return new Response(JSON.stringify({ 
      success: true, 
      song_id: song.id,
      status: 'completed',
      task_id: taskId
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('❌ Callback error:', error)
    return new Response(JSON.stringify({ error: 'Internal error: ' + error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
