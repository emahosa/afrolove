
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
    const sunoApiKey = Deno.env.get('SUNO_API_KEY')
    
    if (!sunoApiKey) {
      console.error('❌ SUNO_API_KEY not configured')
      return new Response(JSON.stringify({ error: 'SUNO_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { taskId } = await req.json()

    console.log('🔍 Checking status for task:', taskId)

    if (!taskId) {
      return new Response(JSON.stringify({ error: 'Task ID required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Find the song with this task ID
    const { data: existingSong, error: findError } = await supabase
      .from('songs')
      .select('id, title, status, created_at, type')
      .eq('audio_url', taskId)
      .eq('status', 'pending')
      .single()

    if (findError || !existingSong) {
      console.log('❌ Song not found with task ID:', taskId)
      return new Response(JSON.stringify({ 
        error: 'Song not found with this task ID',
        taskId,
        success: false,
        updated: false
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('✅ Found song to check:', existingSong)

    // Check if song is too old (older than 10 minutes) - mark as failed
    const songAge = Date.now() - new Date(existingSong.created_at).getTime()
    const maxAge = 10 * 60 * 1000 // 10 minutes

    if (songAge > maxAge) {
      console.log('⏰ Song is too old, marking as failed')
      
      const { data: updatedSong, error: updateError } = await supabase
        .from('songs')
        .update({
          status: 'rejected',
          audio_url: 'error: Generation timeout - song took too long to generate',
          updated_at: new Date().toISOString()
        })
        .eq('id', existingSong.id)
        .select()

      return new Response(JSON.stringify({ 
        success: true,
        updated: true,
        failed: true,
        message: 'Song marked as failed due to timeout',
        song: updatedSong?.[0]
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Check status using the correct API endpoint
    console.log(`🔍 Checking status with Suno API`)
    
    const statusResponse = await fetch(`https://apibox.erweima.ai/api/v1/generate/record-info?taskId=${taskId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${sunoApiKey}`,
        'Accept': 'application/json'
      }
    })

    console.log('📥 Status API response status:', statusResponse.status)
    
    const responseText = await statusResponse.text()
    console.log('📥 Status API response body:', responseText)

    if (!statusResponse.ok) {
      console.log(`❌ Status API failed:`, statusResponse.status, responseText)
      
      return new Response(JSON.stringify({ 
        success: true,
        updated: false,
        processing: true,
        message: 'Still checking status - API not responding',
        lastError: `Status check failed: ${statusResponse.status}`
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    let statusData
    try {
      statusData = JSON.parse(responseText)
    } catch (parseError) {
      console.log(`❌ Parse error:`, parseError)
      return new Response(JSON.stringify({ 
        success: true,
        updated: false,
        processing: true,
        message: 'Still checking status - invalid response format'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('🔍 Status data received:', JSON.stringify(statusData, null, 2))

    // Check if API returned error
    if (statusData.code !== 200) {
      console.log(`❌ API returned error code:`, statusData.code, statusData.msg)
      return new Response(JSON.stringify({ 
        success: true,
        updated: false,
        processing: true,
        message: 'Still processing...',
        lastError: statusData.msg
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Process the response from the API
    const taskData = statusData.data
    
    if (!taskData) {
      console.log('❌ No task data in response')
      return new Response(JSON.stringify({ 
        success: true,
        updated: false,
        processing: true,
        message: 'Still processing...'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('🔍 Task status:', taskData.status)

    // Check if generation completed successfully - look for actual audio URLs
    if (taskData.status === 'SUCCESS' && taskData.response && taskData.response.sunoData) {
      const sunoTracks = taskData.response.sunoData
      console.log('🎵 Found Suno tracks:', sunoTracks.length)
      
      // Look for a track with a proper audio URL
      const completedTrack = sunoTracks.find(track => 
        track.audioUrl && track.audioUrl.startsWith('http')
      )
      
      if (completedTrack) {
        console.log('✅ Found completed track with audio URL:', completedTrack.audioUrl)
        
        // Prepare update data with all available fields
        const updateData = {
          status: 'completed',
          audio_url: completedTrack.audioUrl,
          title: completedTrack.title || existingSong.title,
          updated_at: new Date().toISOString()
        }

        // Add lyrics if available
        if (completedTrack.lyric || completedTrack.lyrics) {
          updateData.lyrics = completedTrack.lyric || completedTrack.lyrics
        }

        // For songs (not instrumentals), try to get vocal and instrumental URLs
        if (existingSong.type === 'song') {
          // Look for vocal-only version
          const vocalTrack = sunoTracks.find(track => 
            track.type === 'vocal' || track.audioUrl?.includes('vocal')
          )
          if (vocalTrack && vocalTrack.audioUrl) {
            updateData.vocal_url = vocalTrack.audioUrl
          }

          // Look for instrumental version
          const instrumentalTrack = sunoTracks.find(track => 
            track.type === 'instrumental' || track.audioUrl?.includes('instrumental')
          )
          if (instrumentalTrack && instrumentalTrack.audioUrl) {
            updateData.instrumental_url = instrumentalTrack.audioUrl
          }
        }

        console.log('📝 Update data:', updateData)
        
        const { data: updatedSong, error: updateError } = await supabase
          .from('songs')
          .update(updateData)
          .eq('id', existingSong.id)
          .select()

        if (updateError) {
          console.error('❌ Failed to update song:', updateError)
          return new Response(JSON.stringify({ 
            error: 'Database update failed',
            success: false,
            updated: false
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        console.log('✅ Song updated successfully:', updatedSong)
        
        return new Response(JSON.stringify({ 
          success: true,
          updated: true,
          song: updatedSong?.[0],
          data: statusData 
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      } else {
        console.log('⏳ Tracks found but no audio URLs yet')
        return new Response(JSON.stringify({ 
          success: true,
          updated: false,
          processing: true,
          status: 'Generating audio...',
          data: statusData 
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      
    } else if (taskData.status === 'CREATE_TASK_FAILED' || 
               taskData.status === 'GENERATE_AUDIO_FAILED' || 
               taskData.status === 'SENSITIVE_WORD_ERROR') {
      console.log('❌ Generation failed, updating status')
      
      const { data: updatedSong, error: updateError } = await supabase
        .from('songs')
        .update({
          status: 'rejected',
          audio_url: `error: ${taskData.status} - Generation failed`,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingSong.id)
        .select()

      return new Response(JSON.stringify({ 
        success: true,
        updated: true,
        failed: true,
        song: updatedSong?.[0],
        data: statusData 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Still processing (PENDING, TEXT_SUCCESS, FIRST_SUCCESS)
    let statusMessage = 'Still processing...'
    if (taskData.status === 'TEXT_SUCCESS') {
      statusMessage = 'Lyrics generated, creating audio...'
    } else if (taskData.status === 'FIRST_SUCCESS') {
      statusMessage = 'First track completed, generating second track...'
    }
    
    console.log('⏳ Song still processing...')
    return new Response(JSON.stringify({ 
      success: true,
      updated: false,
      processing: true,
      status: statusMessage,
      data: statusData 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('❌ Status check error:', error)
    return new Response(JSON.stringify({ 
      error: 'Internal error: ' + error.message,
      success: false,
      updated: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
