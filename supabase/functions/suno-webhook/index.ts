
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
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    const payload = await req.json()
    console.log('🔔 WEBHOOK PAYLOAD RECEIVED:', JSON.stringify(payload, null, 2))

    // Handle different callback structures from Suno
    let taskId = null
    let audioData = null
    let status = null

    // Try to extract data from various possible structures
    if (payload.taskId) {
      taskId = payload.taskId
      audioData = payload.data || payload.tracks || payload.sunoData
      status = payload.status
      console.log('📋 Using direct properties from payload')
    } else if (payload.data) {
      if (Array.isArray(payload.data) && payload.data.length > 0) {
        const item = payload.data[0]
        taskId = item.id || item.taskId || item.task_id
        audioData = item.tracks || item.sunoData || [item]
        status = item.status
        console.log('📋 Using data array structure - first item:', JSON.stringify(item, null, 2))
      } else if (typeof payload.data === 'object') {
        taskId = payload.data.id || payload.data.taskId || payload.data.task_id
        audioData = payload.data.tracks || payload.data.sunoData || [payload.data]
        status = payload.data.status
        console.log('📋 Using data object structure:', JSON.stringify(payload.data, null, 2))
      }
    } else if (payload.id) {
      taskId = payload.id
      audioData = payload.tracks || payload.sunoData || [payload]
      status = payload.status
      console.log('📋 Using ID as taskId from root payload')
    }

    console.log('📋 EXTRACTED DATA:', { taskId, status, audioDataCount: audioData?.length || 0 })

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
      .select('id, title, status, user_id, audio_url, created_at, type')
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
    let updateData: any = {
      updated_at: new Date().toISOString()
    }

    // Check if generation completed successfully
    if ((status === 'SUCCESS' || status === 'completed' || status === 'finished') && audioData && audioData.length > 0) {
      console.log('✅ GENERATION COMPLETED! Processing audio data...')
      console.log('🎵 Audio data received:', JSON.stringify(audioData, null, 2))
      
      // Get the first track (main song)
      const mainTrack = audioData[0]
      
      // Extract audio URL
      const audioUrl = mainTrack.audio_url || mainTrack.audioUrl || mainTrack.url
      if (audioUrl && audioUrl.startsWith('http')) {
        updateData.status = 'completed'
        updateData.audio_url = audioUrl
        console.log('✅ MARKING SONG AS COMPLETED with audio URL:', audioUrl)
      } else {
        console.log('❌ No valid audio URL in completed track')
        return new Response(JSON.stringify({ 
          success: true,
          message: 'Completion received but no valid audio URL',
          processing: true
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      
      // Update title if provided and different
      const title = mainTrack.title || mainTrack.name
      if (title && title !== existingSong.title && title.trim() !== '') {
        updateData.title = title
        console.log('✅ Updating title to:', title)
      }

      // Extract lyrics
      const lyrics = mainTrack.lyric || mainTrack.lyrics || mainTrack.text
      if (lyrics && lyrics.trim() !== '') {
        updateData.lyrics = lyrics
        console.log('✅ Adding lyrics:', lyrics.substring(0, 100) + '...')
      }

      // For songs (not instrumentals), try to extract vocal and instrumental URLs
      if (existingSong.type === 'song') {
        // Look for tracks with different types
        for (const track of audioData) {
          // Check for vocal track
          if (track.type === 'vocal' || track.track_type === 'vocal') {
            const vocalUrl = track.audio_url || track.audioUrl
            if (vocalUrl && vocalUrl.startsWith('http')) {
              updateData.vocal_url = vocalUrl
              console.log('✅ Found vocal URL:', vocalUrl)
            }
          }
          
          // Check for instrumental track
          if (track.type === 'instrumental' || track.track_type === 'instrumental') {
            const instrumentalUrl = track.audio_url || track.audioUrl
            if (instrumentalUrl && instrumentalUrl.startsWith('http')) {
              updateData.instrumental_url = instrumentalUrl
              console.log('✅ Found instrumental URL:', instrumentalUrl)
            }
          }
        }

        // If we have multiple tracks but no explicit designation, use second as instrumental
        if (!updateData.vocal_url && !updateData.instrumental_url && audioData.length >= 2) {
          const secondTrack = audioData[1]
          const secondAudioUrl = secondTrack.audio_url || secondTrack.audioUrl
          if (secondAudioUrl && secondAudioUrl.startsWith('http')) {
            updateData.instrumental_url = secondAudioUrl
            console.log('✅ Using second track as instrumental:', secondAudioUrl)
          }
        }
      }
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
