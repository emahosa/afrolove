
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

    // Extract task ID from the callback data
    let taskId = null
    let audioUrl = null
    let status = null

    // Handle different callback structures from Suno
    if (body.data) {
      if (Array.isArray(body.data) && body.data.length > 0) {
        taskId = body.data[0].id || body.data[0].taskId
        audioUrl = body.data[0].audio_url
        status = body.data[0].status
      } else if (typeof body.data === 'object') {
        taskId = body.data.id || body.data.taskId
        audioUrl = body.data.audio_url
        status = body.data.status
      }
    } else if (body.taskId) {
      taskId = body.taskId
      audioUrl = body.audio_url
      status = body.status
    }

    console.log('📋 Extracted from callback - taskId:', taskId, 'audioUrl:', audioUrl, 'status:', status)

    if (!taskId) {
      console.error('❌ No task ID found in callback')
      return new Response(JSON.stringify({ error: 'No task ID in callback' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Find the song by task ID (stored in audio_url field)
    const { data: song, error: findError } = await supabase
      .from('songs')
      .select('*')
      .eq('audio_url', taskId)
      .single()

    if (findError || !song) {
      console.error('❌ Error finding song by task ID:', taskId, findError)
      return new Response(JSON.stringify({ error: 'Song not found for task ID: ' + taskId }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`📋 Found song: ${song.id} for task: ${taskId}`)

    // Only update if we have a valid audio URL
    if (audioUrl && audioUrl !== 'generating') {
      const updateData = {
        status: 'completed',
        audio_url: audioUrl,
        updated_at: new Date().toISOString()
      }

      console.log('🔄 Updating song with:', updateData)

      const { error: updateError } = await supabase
        .from('songs')
        .update(updateData)
        .eq('id', song.id)

      if (updateError) {
        console.error('❌ Error updating song:', updateError)
        return new Response(JSON.stringify({ error: 'Update failed' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      console.log(`✅ Song ${song.id} updated successfully with audio URL`)
    } else {
      console.log('⚠️ No valid audio URL in callback, not updating')
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
