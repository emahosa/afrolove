
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
    let songsData = []

    if (payload.data?.task_id) {
      taskId = payload.data.task_id
      songsData = payload.data.data || []
    } else if (payload.task_id) {
      taskId = payload.task_id
      songsData = payload.data || []
    }

    if (!taskId) {
      console.error('❌ No task ID found in webhook payload')
      return new Response(JSON.stringify({ error: 'No task ID found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`📋 Processing webhook for task: ${taskId} with ${songsData.length} songs`)

    // Find the song with this task ID
    const { data: existingSong, error: findError } = await supabase
      .from('songs')
      .select('id, title, status, user_id')
      .eq('audio_url', taskId)
      .eq('status', 'pending')
      .single()

    if (findError || !existingSong) {
      console.error('❌ Song not found with task ID:', taskId)
      return new Response(JSON.stringify({ 
        error: 'Song not found',
        taskId 
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`✅ Found song: ${existingSong.id} for task: ${taskId}`)

    // Process the completed songs
    for (const song of songsData) {
      if (song.audio_url && song.status === 'SUCCESS') {
        console.log('🎵 Updating song with completed audio:', song.audio_url)
        
        const { data: updatedSong, error: updateError } = await supabase
          .from('songs')
          .update({
            status: 'completed',
            audio_url: song.audio_url,
            title: song.title || existingSong.title,
            updated_at: new Date().toISOString()
          })
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
          message: 'Song updated successfully',
          song_id: existingSong.id,
          task_id: taskId
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })

      } else if (song.status === 'FAIL' || song.status === 'FAILED') {
        console.log('❌ Song generation failed, updating status')
        
        const { data: updatedSong, error: updateError } = await supabase
          .from('songs')
          .update({
            status: 'rejected',
            audio_url: `error: ${song.error_message || 'Generation failed'}`,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingSong.id)
          .select()

        return new Response(JSON.stringify({ 
          success: true,
          message: 'Song marked as failed',
          song_id: existingSong.id,
          task_id: taskId
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    // If we get here, the song is still processing
    console.log('⏳ Song still processing, no update needed')
    return new Response(JSON.stringify({ 
      success: true,
      message: 'Webhook received, song still processing',
      task_id: taskId
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
