
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
    console.log('🔔 Suno Callback received:', JSON.stringify(body, null, 2))

    // Extract task ID and audio URL from the callback
    let taskId = null
    let audioUrl = null
    let status = null
    let title = null

    // Handle different callback structures
    if (body.taskId) {
      taskId = body.taskId
      audioUrl = body.audioUrl || body.audio_url
      status = body.status
      title = body.title
    } else if (body.data) {
      if (Array.isArray(body.data) && body.data.length > 0) {
        const item = body.data[0]
        taskId = item.id || item.taskId || item.task_id
        audioUrl = item.audio_url || item.audioUrl
        status = item.status
        title = item.title
      } else if (typeof body.data === 'object') {
        taskId = body.data.id || body.data.taskId || body.data.task_id
        audioUrl = body.data.audio_url || body.data.audioUrl
        status = body.data.status
        title = body.data.title
      }
    }

    // Fallback to direct properties
    if (!taskId) {
      taskId = body.id || body.task_id
    }
    if (!audioUrl) {
      audioUrl = body.audio_url || body.audioUrl
    }
    if (!status) {
      status = body.status
    }

    console.log('📋 Extracted - taskId:', taskId, 'audioUrl:', audioUrl, 'status:', status)

    if (!taskId) {
      console.error('❌ No task ID found in callback')
      return new Response(JSON.stringify({ error: 'No task ID in callback' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Find song by task ID - we stored the task ID in the audio_url field initially
    const { data: songs, error: findError } = await supabase
      .from('songs')
      .select('*')
      .eq('audio_url', taskId)
      .eq('status', 'pending')

    if (findError) {
      console.error('❌ Error finding song:', findError)
      return new Response(JSON.stringify({ error: 'Database error: ' + findError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (!songs || songs.length === 0) {
      console.error('❌ No pending song found with task ID:', taskId)
      // Try to find by any status in case it was already updated
      const { data: anySongs } = await supabase
        .from('songs')
        .select('*')
        .eq('audio_url', taskId)
        .limit(1)

      if (anySongs && anySongs.length > 0) {
        console.log('📋 Song already processed:', anySongs[0].id)
        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Song already processed',
          song_id: anySongs[0].id 
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      return new Response(JSON.stringify({ error: 'No song found for task ID: ' + taskId }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const song = songs[0]
    console.log(`📋 Found song: ${song.id} for task: ${taskId}`)

    // Update the song based on the callback status
    if (audioUrl && audioUrl !== taskId && (status === 'completed' || status === 'SUCCESS' || status === 'finished')) {
      const updateData = {
        status: 'completed',
        audio_url: audioUrl,
        updated_at: new Date().toISOString()
      }

      // Update title if provided and different
      if (title && title !== song.title && title.trim() !== '') {
        updateData.title = title
      }

      console.log('🔄 Updating song to completed with:', updateData)

      const { error: updateError } = await supabase
        .from('songs')
        .update(updateData)
        .eq('id', song.id)

      if (updateError) {
        console.error('❌ Error updating song:', updateError)
        return new Response(JSON.stringify({ error: 'Update failed: ' + updateError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      console.log(`✅ Song ${song.id} updated successfully with audio URL: ${audioUrl}`)
    } else if (status === 'failed' || status === 'FAIL' || status === 'error') {
      // Handle failed generation
      const { error: updateError } = await supabase
        .from('songs')
        .update({
          status: 'rejected',
          updated_at: new Date().toISOString()
        })
        .eq('id', song.id)

      if (updateError) {
        console.error('❌ Error updating failed song:', updateError)
      } else {
        console.log(`❌ Song ${song.id} marked as failed`)
      }
    } else {
      console.log('⚠️ No valid audio URL in callback or still processing, status:', status)
    }

    return new Response(JSON.stringify({ 
      success: true, 
      song_id: song.id,
      task_id: taskId,
      message: 'Callback processed successfully'
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
