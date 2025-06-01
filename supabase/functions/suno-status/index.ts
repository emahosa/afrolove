
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req) => {
  console.log('🔍 SUNO STATUS CHECK STARTED')
  console.log('📋 Request method:', req.method)
  console.log('⏰ Request time:', new Date().toISOString())

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const sunoApiKey = Deno.env.get('SUNO_API_KEY')
    
    if (!sunoApiKey) {
      console.error('❌ SUNO_API_KEY not configured')
      return new Response(JSON.stringify({ 
        error: 'SUNO_API_KEY not configured',
        success: false 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const body = await req.json()
    const { taskId } = body

    console.log('🔍 Checking status for task:', taskId)

    if (!taskId || taskId === 'test') {
      console.log('🧪 API Key test request detected')
      return new Response(JSON.stringify({ 
        success: true,
        message: 'API key test successful'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Call the status endpoint according to API documentation
    const statusResponse = await fetch(`https://apibox.erweima.ai/api/v1/generate/record-info?taskId=${taskId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${sunoApiKey}`,
        'Accept': 'application/json'
      }
    })

    console.log('📥 Suno status API response status:', statusResponse.status)
    
    const statusText = await statusResponse.text()
    console.log('📥 Suno status API response body:', statusText)

    if (!statusResponse.ok) {
      console.error('❌ Suno status API error:', statusResponse.status, statusText)
      return new Response(JSON.stringify({ 
        error: 'Failed to check task status',
        success: false 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    let statusData
    try {
      statusData = JSON.parse(statusText)
    } catch (parseError) {
      console.error('❌ Failed to parse status response:', parseError)
      return new Response(JSON.stringify({ 
        error: 'Invalid response format from status API',
        success: false
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('📊 Parsed status data:', statusData)

    // Find the song record that's pending with this task ID
    const { data: songRecord, error: findError } = await supabase
      .from('songs')
      .select('*')
      .eq('audio_url', `pending:${taskId}`)
      .eq('status', 'pending')
      .single()

    if (findError || !songRecord) {
      console.log('ℹ️ No pending song found for task ID:', taskId)
      return new Response(JSON.stringify({ 
        success: true,
        updated: false,
        message: 'No pending song found for this task ID'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('📋 Found song record:', songRecord.id, songRecord.title)

    // Check if the task is completed according to API documentation
    if (statusData.code === 200 && statusData.data) {
      const taskData = statusData.data
      console.log('🎵 Task data received:', taskData)

      // Check for successful completion
      if (taskData.status === 'SUCCESS' && taskData.response && Array.isArray(taskData.response) && taskData.response.length > 0) {
        const audioTrack = taskData.response[0] // Get first track
        console.log('✅ Song generation completed!', audioTrack)
        
        const updateData = {
          status: 'completed',
          audio_url: audioTrack.audio_url || audioTrack.audioUrl,
          updated_at: new Date().toISOString()
        }

        // Add lyrics if available
        if (audioTrack.prompt && !songRecord.lyrics) {
          updateData.lyrics = audioTrack.prompt
        }

        // Add title if available and not already set
        if (audioTrack.title && (!songRecord.title || songRecord.title.includes('Generated'))) {
          updateData.title = audioTrack.title
        }

        // Set vocal and instrumental URLs based on type
        if (songRecord.type === 'song') {
          updateData.vocal_url = audioTrack.audio_url || audioTrack.audioUrl
          updateData.instrumental_url = audioTrack.audio_url || audioTrack.audioUrl
        } else {
          updateData.instrumental_url = audioTrack.audio_url || audioTrack.audioUrl
        }

        console.log('📝 Updating song with data:', updateData)

        const { error: updateError } = await supabase
          .from('songs')
          .update(updateData)
          .eq('id', songRecord.id)

        if (updateError) {
          console.error('❌ Failed to update song:', updateError)
          return new Response(JSON.stringify({ 
            error: 'Failed to update song record',
            success: false 
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        console.log('✅ Song updated successfully!')
        
        return new Response(JSON.stringify({ 
          success: true,
          updated: true,
          status: 'completed',
          data: audioTrack
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      } else if (['CREATE_TASK_FAILED', 'GENERATE_AUDIO_FAILED', 'CALLBACK_EXCEPTION', 'SENSITIVE_WORD_ERROR'].includes(taskData.status)) {
        console.log('❌ Song generation failed with status:', taskData.status)
        
        const { error: updateError } = await supabase
          .from('songs')
          .update({
            status: 'rejected',
            audio_url: `error: ${taskData.status}`,
            updated_at: new Date().toISOString()
          })
          .eq('id', songRecord.id)

        if (updateError) {
          console.error('❌ Failed to update failed song:', updateError)
        }

        return new Response(JSON.stringify({ 
          success: true,
          updated: true,
          status: 'failed'
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      } else {
        console.log('⏳ Song still in progress, status:', taskData.status)
        return new Response(JSON.stringify({ 
          success: true,
          updated: false,
          status: taskData.status || 'pending'
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    // Task is still pending
    console.log('⏳ Task still pending')
    return new Response(JSON.stringify({ 
      success: true,
      updated: false,
      status: 'pending'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('💥 CRITICAL ERROR in suno-status function:', error)
    
    return new Response(JSON.stringify({ 
      error: 'Internal server error: ' + error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
