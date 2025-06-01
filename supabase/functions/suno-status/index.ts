
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

    // Use the correct Suno API v2 status endpoint
    const statusResponse = await fetch(`https://api.sunoaiapi.com/api/v1/gateway/query?ids=${taskId}`, {
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
        status: statusResponse.status,
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

    // Find the song record in our database
    const { data: songRecord, error: findError } = await supabase
      .from('songs')
      .select('*')
      .eq('audio_url', taskId)
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

    // Check if the task is completed
    if (statusData.success && statusData.data && Array.isArray(statusData.data) && statusData.data.length > 0) {
      const taskData = statusData.data[0]
      console.log('🎵 Task data received:', taskData)

      // Check if the track is completed
      if (taskData.status === 'complete' && taskData.audio_url) {
        console.log('✅ Song generation completed!')
        
        const updateData = {
          status: 'completed',
          audio_url: taskData.audio_url,
          updated_at: new Date().toISOString()
        }

        // Add lyrics if available
        if (taskData.lyric) {
          updateData.lyrics = taskData.lyric
        }

        // Add title if available and not already set
        if (taskData.title && (!songRecord.title || songRecord.title.includes('Generated'))) {
          updateData.title = taskData.title
        }

        // Add image URL if available
        if (taskData.image_url) {
          updateData.image_url = taskData.image_url
        }

        // Set vocal and instrumental URLs based on type
        if (songRecord.type === 'song') {
          updateData.vocal_url = taskData.audio_url
          // For now, use the same URL for instrumental until we implement proper splitting
          updateData.instrumental_url = taskData.audio_url
        } else {
          updateData.instrumental_url = taskData.audio_url
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
          data: taskData
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      } else if (taskData.status === 'failed' || taskData.status === 'error') {
        console.log('❌ Song generation failed')
        
        const { error: updateError } = await supabase
          .from('songs')
          .update({
            status: 'rejected',
            audio_url: 'error: Generation failed',
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
