
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

    // Check status with Suno API
    const statusResponse = await fetch(`https://apibox.erweima.ai/api/v1/query?taskId=${taskId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${sunoApiKey}`,
        'Accept': 'application/json'
      }
    })

    const statusText = await statusResponse.text()
    console.log('🔍 Raw Suno API response:', statusText)

    if (!statusResponse.ok) {
      console.error('❌ Suno API error:', statusText)
      return new Response(JSON.stringify({ 
        error: 'Failed to check status',
        details: statusText 
      }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    let statusData
    try {
      statusData = JSON.parse(statusText)
    } catch (parseError) {
      console.error('❌ Failed to parse response:', parseError)
      return new Response(JSON.stringify({ error: 'Invalid status response' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('🔍 Parsed status data:', JSON.stringify(statusData, null, 2))

    // Check if generation is complete
    if (statusData.data && Array.isArray(statusData.data) && statusData.data.length > 0) {
      const item = statusData.data[0]
      console.log('🔍 Song item details:', JSON.stringify(item, null, 2))
      
      if (item.status === 'SUCCESS' && item.audio_url) {
        console.log('✅ Generation completed! Updating database...')
        
        // Find and update the song
        const { data: updatedSong, error: updateError } = await supabase
          .from('songs')
          .update({
            status: 'completed',
            audio_url: item.audio_url,
            title: item.title || 'Generated Song'
          })
          .eq('audio_url', taskId)
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
        
      } else if (item.status === 'FAIL' || item.status === 'FAILED') {
        console.log('❌ Generation failed, updating status')
        
        await supabase
          .from('songs')
          .update({
            status: 'rejected',
            audio_url: `error: ${item.error_message || 'Generation failed'}`
          })
          .eq('audio_url', taskId)

        return new Response(JSON.stringify({ 
          success: true,
          updated: true,
          failed: true,
          data: statusData 
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    // Still processing
    console.log('⏳ Song still processing...')
    return new Response(JSON.stringify({ 
      success: true,
      updated: false,
      data: statusData 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('❌ Status check error:', error)
    return new Response(JSON.stringify({ 
      error: 'Internal error: ' + error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
