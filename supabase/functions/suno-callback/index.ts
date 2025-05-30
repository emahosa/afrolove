
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
    
    // Get song_id from URL parameter
    const url = new URL(req.url)
    const songId = url.searchParams.get('song_id')
    
    const body = await req.json()
    console.log('Suno Callback received for song ID:', songId)
    console.log('Callback body:', JSON.stringify(body, null, 2))

    if (!songId) {
      console.error('No song_id in callback URL')
      return new Response(JSON.stringify({ error: 'song_id required in URL' }), {
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Extract the relevant data from the callback
    let audioData = null
    let taskId = null

    // Handle different possible callback structures
    if (body.data && Array.isArray(body.data) && body.data.length > 0) {
      audioData = body.data[0]
      taskId = body.data.task_id || body.task_id
    } else if (body.data && body.data.audio_url) {
      audioData = body.data
      taskId = body.data.task_id || body.task_id
    } else if (body.audio_url) {
      audioData = body
      taskId = body.task_id
    }

    console.log('Extracted audio data:', audioData)
    console.log('Task ID:', taskId)

    if (!audioData || !audioData.audio_url) {
      console.error('No audio data in callback')
      return new Response(JSON.stringify({ error: 'Invalid callback - no audio data' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Find the song by ID
    const { data: song, error: findError } = await supabase
      .from('songs')
      .select('*')
      .eq('id', songId)
      .single()

    if (findError || !song) {
      console.error('Error finding song:', findError)
      return new Response(JSON.stringify({ error: 'Song not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`Updating song: ${song.id}`)

    // Prepare update data
    const updateData = {
      status: 'completed',
      audio_url: audioData.audio_url,
      updated_at: new Date().toISOString()
    }

    // Add optional fields if they exist
    if (audioData.prompt && !song.lyrics) {
      updateData.lyrics = audioData.prompt
    }
    if (audioData.stream_audio_url) {
      updateData.instrumental_url = audioData.stream_audio_url
    }
    if (audioData.title && (!song.title || song.title === 'Generated Song')) {
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
      message: 'Song updated successfully'
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
