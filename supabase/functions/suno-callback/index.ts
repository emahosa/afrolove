
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
    
    console.log('Suno Callback: Full payload received:', JSON.stringify(body, null, 2))

    // Handle the nested structure from your example: body.data.data[0]
    const payload = body?.data?.data?.[0]
    const taskId = body?.data?.task_id

    console.log('Extracted payload:', JSON.stringify(payload, null, 2))
    console.log('Extracted task ID:', taskId)

    if (!taskId) {
      console.error('No task_id in callback')
      return new Response(JSON.stringify({ error: 'task_id required' }), {
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (!payload || !payload.audio_url) {
      console.error('Invalid callback payload - no audio data')
      return new Response(JSON.stringify({ error: 'Invalid Suno callback format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Find song by task ID
    const { data: songs, error: findError } = await supabase
      .from('songs')
      .select('*')
      .eq('audio_url', `task_pending:${taskId}`)

    if (findError) {
      console.error('Error finding song:', findError)
      return new Response(JSON.stringify({ error: 'Database error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (!songs || songs.length === 0) {
      console.log(`No song found for task: ${taskId}`)
      return new Response(JSON.stringify({ message: 'Song not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const song = songs[0]
    console.log(`Processing song: ${song.id}`)

    // Extract data from the payload
    const updateData = {
      status: 'completed',
      audio_url: payload.audio_url,
      lyrics: payload.prompt || song.lyrics,
      updated_at: new Date().toISOString()
    }

    // Add optional fields if they exist
    if (payload.stream_audio_url) {
      updateData.instrumental_url = payload.stream_audio_url
    }
    if (payload.image_url) {
      // You might want to add an image_url column to songs table
      console.log('Image URL available:', payload.image_url)
    }

    console.log('Updating song with data:', updateData)

    // Update song record
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
      status: 'completed'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('❌ Callback error:', error)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
