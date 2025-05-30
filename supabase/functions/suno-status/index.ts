
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

    // Find the song with this task ID (stored in audio_url for pending songs)
    const { data: existingSong, error: findError } = await supabase
      .from('songs')
      .select('id, title, status')
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

    // Check status with Suno API
    const statusResponse = await fetch(`https://apibox.erweima.ai/api/v1/query?taskId=${taskId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${sunoApiKey}`,
        'Accept': 'application/json'
      }
    })

    if (!statusResponse.ok) {
      console.error('❌ Suno API error:', statusResponse.status, statusResponse.statusText)
      return new Response(JSON.stringify({ 
        error: 'Failed to check status with Suno API',
        success: false,
        updated: false
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const statusData = await statusResponse.json()
    console.log('🔍 Suno API response:', JSON.stringify(statusData, null, 2))

    // Check if generation is complete
    if (statusData.data && Array.isArray(statusData.data) && statusData.data.length > 0) {
      const item = statusData.data[0]
      console.log('🔍 Song item details:', JSON.stringify(item, null, 2))
      
      if (item.status === 'SUCCESS' && item.audio_url) {
        console.log('✅ Generation completed! Updating database...')
        
        // Update the song with the completed audio URL
        const { data: updatedSong, error: updateError } = await supabase
          .from('songs')
          .update({
            status: 'completed',
            audio_url: item.audio_url,
            title: item.title || existingSong.title
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
          data: statusData 
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
        
      } else if (item.status === 'FAIL' || item.status === 'FAILED') {
        console.log('❌ Generation failed, updating status')
        
        const { data: updatedSong, error: updateError } = await supabase
          .from('songs')
          .update({
            status: 'rejected',
            audio_url: `error: ${item.error_message || 'Generation failed'}`
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
    }

    // Still processing
    console.log('⏳ Song still processing...')
    return new Response(JSON.stringify({ 
      success: true,
      updated: false,
      processing: true,
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
