
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
    
    console.log('Suno Callback: Received data:', JSON.stringify(body, null, 2))

    // Extract task ID from various possible locations
    let taskId = body.task_id || body.taskId || body.data?.task_id || body.data?.taskId
    
    console.log('Extracted task ID:', taskId)

    if (!taskId) {
      console.error('No task_id in callback')
      return new Response(JSON.stringify({ error: 'task_id required' }), {
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

    // Extract audio URL from callback
    let audioUrl = body.audio_url || body.data?.audio_url
    
    // Handle nested data structure
    if (body.data?.data && Array.isArray(body.data.data) && body.data.data.length > 0) {
      audioUrl = body.data.data[0].audio_url
    }

    console.log('Extracted audio URL:', audioUrl)

    let updateData = {
      updated_at: new Date().toISOString()
    }

    if (audioUrl && audioUrl !== 'null') {
      updateData.status = 'completed'
      updateData.audio_url = audioUrl
      console.log('Song completed successfully')
    } else {
      updateData.status = 'rejected'
      updateData.audio_url = 'error: No audio URL received'
      console.log('Song failed - no audio URL')
    }

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

    console.log(`Song ${song.id} updated:`, updateData)

    return new Response(JSON.stringify({ 
      success: true, 
      song_id: song.id,
      status: updateData.status
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Callback error:', error)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
