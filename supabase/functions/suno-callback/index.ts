
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

    // Handle different possible callback structures from Suno API
    let taskId = null
    let audioUrl = null
    let status = null
    let title = null

    // Check for direct properties first
    if (body.taskId || body.id) {
      taskId = body.taskId || body.id
      audioUrl = body.audioUrl || body.audio_url
      status = body.status
      title = body.title
    }
    // Check for data array structure
    else if (body.data && Array.isArray(body.data) && body.data.length > 0) {
      const item = body.data[0]
      taskId = item.id || item.taskId
      audioUrl = item.audio_url || item.audioUrl
      status = item.status
      title = item.title
    }
    // Check for single data object
    else if (body.data && typeof body.data === 'object') {
      taskId = body.data.id || body.data.taskId
      audioUrl = body.data.audio_url || body.data.audioUrl
      status = body.data.status
      title = body.data.title
    }

    console.log('📋 Parsed callback data:', { taskId, audioUrl, status, title })

    if (!taskId) {
      console.error('❌ No task ID found in callback payload')
      return new Response(JSON.stringify({ 
        error: 'No task ID found in callback',
        received: body 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Find the song by task ID stored in audio_url field
    const { data: songs, error: findError } = await supabase
      .from('songs')
      .select('*')
      .eq('audio_url', taskId)

    if (findError) {
      console.error('❌ Error finding song:', findError)
      return new Response(JSON.stringify({ 
        error: 'Database error finding song',
        details: findError.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (!songs || songs.length === 0) {
      console.error('❌ No song found with task ID:', taskId)
      return new Response(JSON.stringify({ 
        error: 'No song found for task ID',
        taskId: taskId 
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const song = songs[0]
    console.log(`📋 Found song: ${song.id} for task: ${taskId}`)

    // Determine the new status and update data
    let updateData = {
      updated_at: new Date().toISOString()
    }

    // Check if generation completed successfully
    if (audioUrl && (status === 'completed' || status === 'SUCCESS' || status === 'finished')) {
      updateData.status = 'completed'
      updateData.audio_url = audioUrl
      
      // Update title if provided and different
      if (title && title !== song.title && title.trim() !== '') {
        updateData.title = title
      }
      
      console.log('✅ Updating song to completed with audio URL:', audioUrl)
    }
    // Check if generation failed
    else if (status === 'failed' || status === 'FAIL' || status === 'error') {
      updateData.status = 'rejected'
      console.log('❌ Marking song as failed')
    }
    // Still processing or unknown status
    else {
      console.log('⏳ Song still processing, status:', status)
      // Don't update status if still processing
      delete updateData.status
    }

    // Update the song record
    const { error: updateError } = await supabase
      .from('songs')
      .update(updateData)
      .eq('id', song.id)

    if (updateError) {
      console.error('❌ Error updating song:', updateError)
      return new Response(JSON.stringify({ 
        error: 'Failed to update song',
        details: updateError.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`✅ Song ${song.id} updated successfully`)

    return new Response(JSON.stringify({ 
      success: true, 
      song_id: song.id,
      task_id: taskId,
      status: updateData.status || 'processing',
      message: 'Callback processed successfully'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('❌ Callback processing error:', error)
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
