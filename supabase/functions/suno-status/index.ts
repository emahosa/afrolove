
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
      .select('id, title, status, created_at')
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

    // Try multiple status check endpoints
    const statusEndpoints = [
      `https://api.sunoaiapi.com/api/v1/gateway/query?taskId=${taskId}`,
      `https://apibox.erweima.ai/api/v1/query?taskId=${taskId}`
    ]

    let statusData = null
    let lastError = null
    let usedEndpoint = null

    for (const endpoint of statusEndpoints) {
      try {
        console.log(`🔍 Checking status with endpoint: ${endpoint}`)
        
        const statusResponse = await fetch(endpoint, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${sunoApiKey}`,
            'Accept': 'application/json'
          }
        })

        if (statusResponse.ok) {
          const responseText = await statusResponse.text()
          console.log('📥 Status API raw response:', responseText)
          
          try {
            statusData = JSON.parse(responseText)
            usedEndpoint = endpoint
            console.log('✅ Got status response from:', endpoint, JSON.stringify(statusData, null, 2))
            break
          } catch (parseError) {
            lastError = `Parse error from ${endpoint}: ${parseError.message}`
            console.log(`❌ Parse error from ${endpoint}:`, parseError)
          }
        } else {
          lastError = `${endpoint}: ${statusResponse.status} ${statusResponse.statusText}`
          console.log(`❌ Status API failed for ${endpoint}:`, lastError)
        }
      } catch (error) {
        lastError = `${endpoint}: ${error.message}`
        console.log(`❌ Status check error for ${endpoint}:`, error.message)
      }
    }

    if (!statusData) {
      console.log('❌ All status check endpoints failed, last error:', lastError)
      
      return new Response(JSON.stringify({ 
        success: true,
        updated: false,
        processing: true,
        message: 'Still checking status - all APIs not responding',
        lastError
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Process the response - handle different response formats
    let songItems = []
    
    if (statusData.data && Array.isArray(statusData.data)) {
      songItems = statusData.data
    } else if (statusData.data && statusData.data.items) {
      songItems = statusData.data.items
    } else if (Array.isArray(statusData)) {
      songItems = statusData
    } else if (statusData.status || statusData.audio_url) {
      songItems = [statusData]
    } else if (statusData.data && (statusData.data.status || statusData.data.audio_url)) {
      songItems = [statusData.data]
    }

    console.log('🔍 Song items found:', songItems.length, 'using endpoint:', usedEndpoint)

    if (songItems.length > 0) {
      const item = songItems[0] // Take the first item
      console.log('🔍 Processing item:', JSON.stringify(item, null, 2))
      
      if ((item.status === 'SUCCESS' || item.status === 'complete' || item.status === 'completed') && item.audio_url) {
        console.log('✅ Generation completed! Updating database...')
        
        const { data: updatedSong, error: updateError } = await supabase
          .from('songs')
          .update({
            status: 'completed',
            audio_url: item.audio_url,
            title: item.title || existingSong.title,
            updated_at: new Date().toISOString()
          })
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
          endpoint_used: usedEndpoint,
          data: statusData 
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
        
      } else if (item.status === 'FAIL' || item.status === 'FAILED' || item.status === 'error' || item.status === 'failed') {
        console.log('❌ Generation failed, updating status')
        
        const { data: updatedSong, error: updateError } = await supabase
          .from('songs')
          .update({
            status: 'rejected',
            audio_url: `error: ${item.error_message || item.message || 'Generation failed'}`,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingSong.id)
          .select()

        return new Response(JSON.stringify({ 
          success: true,
          updated: true,
          failed: true,
          song: updatedSong?.[0],
          endpoint_used: usedEndpoint,
          data: statusData 
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    // Still processing
    console.log('⏳ Song still processing... using endpoint:', usedEndpoint)
    return new Response(JSON.stringify({ 
      success: true,
      updated: false,
      processing: true,
      endpoint_used: usedEndpoint,
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
