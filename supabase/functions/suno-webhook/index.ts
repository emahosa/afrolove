
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
    
    const payload = await req.json()
    console.log('🔔 Suno Webhook received:', JSON.stringify(payload, null, 2))

    // Handle different callback structures from Suno
    let taskId = null
    let audioUrl = null
    let status = null
    let title = null

    // Try to extract data from various possible structures
    if (payload.taskId) {
      taskId = payload.taskId
      audioUrl = payload.audioUrl || payload.audio_url
      status = payload.status
      title = payload.title
      console.log('📋 Using direct properties')
    } else if (payload.data) {
      if (Array.isArray(payload.data) && payload.data.length > 0) {
        const item = payload.data[0]
        taskId = item.id || item.taskId
        audioUrl = item.audio_url || item.audioUrl
        status = item.status
        title = item.title
        console.log('📋 Using data array structure')
      } else if (typeof payload.data === 'object') {
        taskId = payload.data.id || payload.data.taskId || payload.data.task_id
        audioUrl = payload.data.audio_url || payload.data.audioUrl
        status = payload.data.status
        title = payload.data.title
        console.log('📋 Using data object structure')
      }
    } else if (payload.id) {
      taskId = payload.id
      audioUrl = payload.audio_url || payload.audioUrl
      status = payload.status
      title = payload.title
      console.log('📋 Using ID as taskId')
    }

    console.log('📋 Extracted data:', { taskId, audioUrl, status, title })

    if (!taskId) {
      console.error('❌ No task ID found in webhook payload')
      console.log('❌ Available keys in payload:', Object.keys(payload))
      return new Response(JSON.stringify({ 
        error: 'No task ID found in webhook',
        received: payload,
        available_keys: Object.keys(payload)
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Find the song with this task ID
    console.log('🔍 Searching for song with task ID:', taskId)
    const { data: existingSong, error: findError } = await supabase
      .from('songs')
      .select('id, title, status, user_id')
      .eq('audio_url', taskId)
      .eq('status', 'pending')
      .single()

    if (findError || !existingSong) {
      console.error('❌ Song not found with task ID:', taskId, findError)
      return new Response(JSON.stringify({ 
        error: 'Song not found',
        taskId,
        debug: findError
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`✅ Found song: ${existingSong.id} for task: ${taskId}`)

    // Determine the update based on status
    let updateData = {
      updated_at: new Date().toISOString()
    }

    // Check if generation completed successfully
    if (audioUrl && (status === 'SUCCESS' || status === 'completed' || status === 'finished')) {
      updateData.status = 'completed'
      updateData.audio_url = audioUrl
      
      // Update title if provided and different
      if (title && title !== existingSong.title && title.trim() !== '') {
        updateData.title = title
      }
      
      console.log('✅ Marking song as completed with audio URL:', audioUrl)
    }
    // Check if generation failed
    else if (status === 'FAIL' || status === 'FAILED' || status === 'error' || status === 'failed') {
      updateData.status = 'rejected'
      updateData.audio_url = `error: ${payload.error_message || payload.message || 'Generation failed'}`
      console.log('❌ Marking song as failed')
    }
    // Still processing
    else {
      console.log('⏳ Song still processing, status:', status)
      // Don't update status, just timestamp
    }

    console.log('📝 Update data:', updateData)

    // Update the song record
    const { data: updatedSong, error: updateError } = await supabase
      .from('songs')
      .update(updateData)
      .eq('id', existingSong.id)
      .select()

    if (updateError) {
      console.error('❌ Failed to update song:', updateError)
      return new Response(JSON.stringify({ 
        error: 'Database update failed',
        details: updateError.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('✅ Song updated successfully via webhook:', updatedSong)
    
    return new Response(JSON.stringify({ 
      success: true,
      message: 'Webhook processed successfully',
      song_id: existingSong.id,
      task_id: taskId,
      status: updateData.status || 'processing'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('❌ Webhook processing error:', error)
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
