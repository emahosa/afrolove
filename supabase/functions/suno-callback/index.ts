
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
    console.log('🔔 Suno Callback received - RAW BODY:', JSON.stringify(body, null, 2))

    // Handle different possible callback structures from Suno API
    let taskId = null
    let audioUrl = null
    let status = null
    let title = null

    // Try to extract data from various possible structures
    if (body.taskId) {
      taskId = body.taskId
      audioUrl = body.audioUrl || body.audio_url
      status = body.status
      title = body.title
      console.log('📋 Using direct properties')
    } else if (body.data) {
      if (Array.isArray(body.data) && body.data.length > 0) {
        const item = body.data[0]
        taskId = item.id || item.taskId
        audioUrl = item.audio_url || item.audioUrl
        status = item.status
        title = item.title
        console.log('📋 Using data array structure')
      } else if (typeof body.data === 'object') {
        taskId = body.data.id || body.data.taskId
        audioUrl = body.data.audio_url || body.data.audioUrl
        status = body.data.status
        title = body.data.title
        console.log('📋 Using data object structure')
      }
    } else if (body.id) {
      taskId = body.id
      audioUrl = body.audio_url || body.audioUrl
      status = body.status
      title = body.title
      console.log('📋 Using ID as taskId')
    }

    console.log('📋 Extracted data:', { taskId, audioUrl, status, title })

    if (!taskId) {
      console.error('❌ No task ID found in callback payload')
      console.log('❌ Available keys in body:', Object.keys(body))
      return new Response(JSON.stringify({ 
        error: 'No task ID found in callback',
        received: body,
        available_keys: Object.keys(body)
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Find the song by task ID stored in audio_url field
    console.log('🔍 Searching for song with task ID:', taskId)
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

    console.log('🔍 Found songs:', songs?.length || 0)
    if (songs && songs.length > 0) {
      console.log('📋 Song details:', songs[0])
    }

    if (!songs || songs.length === 0) {
      console.error('❌ No song found with task ID:', taskId)
      
      // Let's also check if there are any songs with this task ID in a different field
      const { data: allSongs } = await supabase
        .from('songs')
        .select('id, title, audio_url, status')
        .order('created_at', { ascending: false })
        .limit(10)
      
      console.log('📋 Recent songs in database:', allSongs)
      
      return new Response(JSON.stringify({ 
        error: 'No song found for task ID',
        taskId: taskId,
        recent_songs: allSongs 
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
      // Don't update status if still processing, but update timestamp
    }

    console.log('📝 Update data:', updateData)

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

    console.log(`✅ Song ${song.id} updated successfully`)
    console.log('📝 Updated song data:', updatedSong)

    return new Response(JSON.stringify({ 
      success: true, 
      song_id: song.id,
      task_id: taskId,
      status: updateData.status || 'processing',
      message: 'Callback processed successfully',
      updated_song: updatedSong
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('❌ Callback processing error:', error)
    console.error('❌ Error stack:', error.stack)
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message,
      stack: error.stack 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
