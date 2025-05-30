
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
    console.log('🔔 WEBHOOK CALLED - Method:', req.method)
    console.log('🔔 WEBHOOK CALLED - URL:', req.url)
    console.log('🔔 WEBHOOK CALLED - Headers:', JSON.stringify([...req.headers.entries()], null, 2))
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    const payload = await req.json()
    console.log('🔔 WEBHOOK PAYLOAD RECEIVED:', JSON.stringify(payload, null, 2))

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
      console.log('📋 Using direct properties from payload')
    } else if (payload.data) {
      if (Array.isArray(payload.data) && payload.data.length > 0) {
        const item = payload.data[0]
        taskId = item.id || item.taskId
        audioUrl = item.audio_url || item.audioUrl
        status = item.status
        title = item.title
        console.log('📋 Using data array structure - first item:', JSON.stringify(item, null, 2))
      } else if (typeof payload.data === 'object') {
        taskId = payload.data.id || payload.data.taskId || payload.data.task_id
        audioUrl = payload.data.audio_url || payload.data.audioUrl
        status = payload.data.status
        title = payload.data.title
        console.log('📋 Using data object structure:', JSON.stringify(payload.data, null, 2))
      }
    } else if (payload.id) {
      taskId = payload.id
      audioUrl = payload.audio_url || payload.audioUrl
      status = payload.status
      title = payload.title
      console.log('📋 Using ID as taskId from root payload')
    }

    console.log('📋 EXTRACTED DATA:', { taskId, audioUrl, status, title })

    if (!taskId) {
      console.error('❌ NO TASK ID FOUND in webhook payload')
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
    console.log('🔍 SEARCHING for song with task ID:', taskId)
    const { data: existingSong, error: findError } = await supabase
      .from('songs')
      .select('id, title, status, user_id, audio_url, created_at')
      .eq('audio_url', taskId)
      .eq('status', 'pending')
      .single()

    if (findError) {
      console.error('❌ DATABASE ERROR finding song:', findError)
      
      // Let's also search without status filter to see what we have
      const { data: allSongs } = await supabase
        .from('songs')
        .select('id, title, status, audio_url, created_at')
        .eq('audio_url', taskId)
      
      console.log('🔍 Found songs with this task ID (any status):', JSON.stringify(allSongs, null, 2))
      
      return new Response(JSON.stringify({ 
        error: 'Database error finding song',
        debug: findError,
        found_songs: allSongs
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (!existingSong) {
      console.error('❌ NO SONG FOUND with task ID:', taskId)
      
      // Let's see what songs exist for debugging
      const { data: recentSongs } = await supabase
        .from('songs')
        .select('id, title, status, audio_url, created_at')
        .order('created_at', { ascending: false })
        .limit(10)
      
      console.log('📋 Recent songs in database for debugging:', JSON.stringify(recentSongs, null, 2))
      
      return new Response(JSON.stringify({ 
        error: 'Song not found',
        taskId,
        recent_songs: recentSongs
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`✅ FOUND SONG: ${existingSong.id} for task: ${taskId}`)
    console.log('📋 Song details:', JSON.stringify(existingSong, null, 2))

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
      
      console.log('✅ MARKING SONG AS COMPLETED with audio URL:', audioUrl)
    }
    // Check if generation failed
    else if (status === 'FAIL' || status === 'FAILED' || status === 'error' || status === 'failed') {
      updateData.status = 'rejected'
      updateData.audio_url = `error: ${payload.error_message || payload.message || 'Generation failed'}`
      console.log('❌ MARKING SONG AS FAILED')
    }
    // Still processing
    else {
      console.log('⏳ SONG STILL PROCESSING, status:', status)
      // Don't update status, just timestamp
    }

    console.log('📝 UPDATE DATA:', JSON.stringify(updateData, null, 2))

    // Update the song record
    const { data: updatedSong, error: updateError } = await supabase
      .from('songs')
      .update(updateData)
      .eq('id', existingSong.id)
      .select()

    if (updateError) {
      console.error('❌ FAILED TO UPDATE SONG:', updateError)
      return new Response(JSON.stringify({ 
        error: 'Database update failed',
        details: updateError.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('✅ SONG UPDATED SUCCESSFULLY via webhook:', JSON.stringify(updatedSong, null, 2))
    
    const successResponse = { 
      success: true,
      message: 'Webhook processed successfully',
      song_id: existingSong.id,
      task_id: taskId,
      status: updateData.status || 'processing'
    }
    
    console.log('🎉 RETURNING WEBHOOK SUCCESS:', JSON.stringify(successResponse, null, 2))
    
    return new Response(JSON.stringify(successResponse), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('❌ CRITICAL WEBHOOK ERROR:', error)
    console.error('❌ Error stack:', error.stack)
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
