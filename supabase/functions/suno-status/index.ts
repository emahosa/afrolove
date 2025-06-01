
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
      .select('id, title, status, created_at, type, user_id')
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
    console.log(`🔍 Checking status with Suno API for task: ${taskId}`)
    
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

    console.log('🔍 Full status data received:', JSON.stringify(statusData, null, 2))

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
    console.log('🔍 Task response data:', JSON.stringify(taskData.response, null, 2))

    // Check if generation completed successfully
    if (taskData.status === 'SUCCESS' && taskData.response && taskData.response.sunoData) {
      const sunoTracks = Array.isArray(taskData.response.sunoData) ? taskData.response.sunoData : [taskData.response.sunoData]
      console.log('🎵 Found Suno tracks:', sunoTracks.length)
      console.log('🎵 Full Suno tracks data:', JSON.stringify(sunoTracks, null, 2))
      
      if (sunoTracks.length > 0) {
        // Get the first track (main song)
        const mainTrack = sunoTracks[0]
        console.log('🎵 Processing main track:', JSON.stringify(mainTrack, null, 2))
        
        // Prepare update data with comprehensive field mapping
        const updateData: any = {
          status: 'completed',
          updated_at: new Date().toISOString()
        }

        // Extract audio URL - try multiple possible field names
        const audioUrl = mainTrack.audio_url || mainTrack.audioUrl || mainTrack.url || mainTrack.audio
        if (audioUrl && audioUrl.startsWith('http')) {
          updateData.audio_url = audioUrl
          console.log('✅ Found main audio URL:', audioUrl)
        } else {
          console.log('❌ No valid audio URL found in main track')
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

        // Extract title
        const title = mainTrack.title || mainTrack.name || existingSong.title
        if (title) {
          updateData.title = title
          console.log('✅ Using title:', title)
        }

        // Extract lyrics - try multiple possible field names
        const lyrics = mainTrack.lyric || mainTrack.lyrics || mainTrack.text
        if (lyrics && lyrics.trim() !== '') {
          updateData.lyrics = lyrics
          console.log('✅ Found lyrics:', lyrics.substring(0, 100) + '...')
        }

        // For songs (not instrumentals), try to extract vocal and instrumental URLs
        if (existingSong.type === 'song') {
          // Look for tracks with different types or URL patterns
          for (const track of sunoTracks) {
            console.log('🔍 Examining track for vocal/instrumental:', JSON.stringify(track, null, 2))
            
            // Check for vocal track
            if (track.type === 'vocal' || track.track_type === 'vocal' || 
                (track.audio_url && track.audio_url.includes('vocal'))) {
              const vocalUrl = track.audio_url || track.audioUrl
              if (vocalUrl && vocalUrl.startsWith('http')) {
                updateData.vocal_url = vocalUrl
                console.log('✅ Found vocal URL:', vocalUrl)
              }
            }
            
            // Check for instrumental track
            if (track.type === 'instrumental' || track.track_type === 'instrumental' || 
                (track.audio_url && track.audio_url.includes('instrumental'))) {
              const instrumentalUrl = track.audio_url || track.audioUrl
              if (instrumentalUrl && instrumentalUrl.startsWith('http')) {
                updateData.instrumental_url = instrumentalUrl
                console.log('✅ Found instrumental URL:', instrumentalUrl)
              }
            }
          }

          // If we have multiple tracks but no explicit vocal/instrumental designation,
          // use the first as main audio and second as instrumental (common Suno pattern)
          if (!updateData.vocal_url && !updateData.instrumental_url && sunoTracks.length >= 2) {
            const secondTrack = sunoTracks[1]
            const secondAudioUrl = secondTrack.audio_url || secondTrack.audioUrl
            if (secondAudioUrl && secondAudioUrl.startsWith('http')) {
              updateData.instrumental_url = secondAudioUrl
              console.log('✅ Using second track as instrumental:', secondAudioUrl)
            }
          }
        }

        console.log('📝 Final update data:', JSON.stringify(updateData, null, 2))
        
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

        console.log('✅ Song updated successfully:', JSON.stringify(updatedSong, null, 2))
        
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
        console.log('❌ No tracks found in response')
        return new Response(JSON.stringify({ 
          success: true,
          updated: false,
          processing: true,
          status: 'No tracks available yet...',
          data: statusData 
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      
    } else if (taskData.status === 'CREATE_TASK_FAILED' || 
               taskData.status === 'GENERATE_AUDIO_FAILED' || 
               taskData.status === 'SENSITIVE_WORD_ERROR' ||
               taskData.status === 'FAILED') {
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
    
    console.log('⏳ Song still processing with status:', taskData.status)
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
