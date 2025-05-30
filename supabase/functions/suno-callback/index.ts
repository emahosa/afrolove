
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
    console.log('🔔 Callback received:', JSON.stringify(body, null, 2))

    // Handle different callback stages: text, first, complete
    let taskId = null
    let audioUrl = null
    let status = null
    let title = null
    let stage = null

    // Extract data from different callback structures
    if (body.taskId) {
      taskId = body.taskId
      audioUrl = body.audioUrl || body.audio_url
      status = body.status
      title = body.title
      stage = body.stage || body.type
    } else if (body.data) {
      if (Array.isArray(body.data) && body.data.length > 0) {
        const item = body.data[0]
        taskId = item.id || item.taskId
        audioUrl = item.audio_url || item.audioUrl
        status = item.status
        title = item.title
        stage = item.stage || item.type
      } else if (typeof body.data === 'object') {
        taskId = body.data.id || body.data.taskId
        audioUrl = body.data.audio_url || body.data.audioUrl
        status = body.data.status
        title = body.data.title
        stage = body.data.stage || body.data.type
      }
    } else if (body.id) {
      taskId = body.id
      audioUrl = body.audio_url || body.audioUrl
      status = body.status
      title = body.title
      stage = body.stage || body.type
    }

    console.log('📋 Extracted callback data:', { taskId, audioUrl, status, title, stage })

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
      .eq('status', 'pending')

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
    console.log(`✅ Found song: ${song.id} for task: ${taskId}`)

    // Handle different callback stages
    let updateData = {
      updated_at: new Date().toISOString()
    }

    // Handle different stages of completion
    if (stage === 'text' || status === 'TEXT_SUCCESS') {
      console.log('📝 Text generation completed')
      // Just update timestamp, don't change status yet
    } else if (stage === 'first' || status === 'FIRST_SUCCESS') {
      console.log('🎵 First audio generated')
      // Could store preview URL if provided
      if (audioUrl) {
        updateData.audio_url = audioUrl
      }
    } else if (stage === 'complete' || status === 'SUCCESS' || status === 'completed' || status === 'finished') {
      console.log('✅ Generation fully completed!')
      
      if (audioUrl) {
        updateData.status = 'completed'
        updateData.audio_url = audioUrl
        
        // Update title if provided and different
        if (title && title !== song.title && title.trim() !== '') {
          updateData.title = title
        }
        
        console.log('✅ Marking song as completed with audio URL:', audioUrl)
      }
    } else if (status === 'failed' || status === 'FAIL' || status === 'error') {
      updateData.status = 'rejected'
      updateData.audio_url = `error: ${body.error_message || body.message || 'Generation failed'}`
      console.log('❌ Marking song as failed')
    } else {
      console.log('⏳ Processing stage:', stage || status)
      // Just update timestamp for intermediate stages
    }

    console.log('📝 Update data:', JSON.stringify(updateData, null, 2))

    // Update the song record
    const { data: updatedSong, error: updateError } = await supabase
      .from('songs')
      .update(updateData)
      .eq('id', song.id)
      .select()

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

    console.log(`✅ Song ${song.id} updated successfully for stage: ${stage || status}`)

    return new Response(JSON.stringify({ 
      success: true, 
      song_id: song.id,
      task_id: taskId,
      stage: stage || status,
      status: updateData.status || 'processing',
      message: `Callback processed successfully for stage: ${stage || status}`
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('💥 Callback processing error:', error)
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
