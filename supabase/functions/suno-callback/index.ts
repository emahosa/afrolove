
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req) => {
  console.log('🎯 SUNO CALLBACK RECEIVED')
  console.log('📋 Request method:', req.method)
  console.log('⏰ Callback time:', new Date().toISOString())

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const callbackData = await req.json()
    
    console.log('📥 Callback data received:', JSON.stringify(callbackData, null, 2))

    // Extract callback information
    const { code, msg, data } = callbackData
    
    if (code !== 200) {
      console.error('❌ Callback received error:', code, msg)
      return new Response(JSON.stringify({ 
        success: false,
        error: `Callback error: ${msg}` 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { callbackType, task_id, data: trackData } = data

    console.log('🎵 Callback type:', callbackType)
    console.log('🆔 Task ID:', task_id)

    if (!task_id) {
      console.error('❌ No task ID in callback')
      return new Response(JSON.stringify({ 
        success: false,
        error: 'No task ID provided' 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Find the song with this task ID
    const { data: existingSong, error: findError } = await supabase
      .from('songs')
      .select('id, title, status')
      .eq('audio_url', task_id)
      .eq('status', 'pending')
      .single()

    if (findError || !existingSong) {
      console.log('❌ Song not found with task ID:', task_id)
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Song not found with this task ID'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('✅ Found song to update:', existingSong)

    // Handle different callback types
    if (callbackType === 'complete' && trackData && trackData.length > 0) {
      console.log('✅ Generation completed! Updating database...')
      
      // Get the first generated track
      const firstTrack = trackData[0]
      
      const { data: updatedSong, error: updateError } = await supabase
        .from('songs')
        .update({
          status: 'completed',
          audio_url: firstTrack.audio_url,
          title: firstTrack.title || existingSong.title,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingSong.id)
        .select()

      if (updateError) {
        console.error('❌ Failed to update song:', updateError)
        return new Response(JSON.stringify({ 
          success: false,
          error: 'Database update failed'
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      console.log('✅ Song updated successfully via callback')
      
      return new Response(JSON.stringify({ 
        success: true,
        message: 'Song updated successfully',
        song: updatedSong?.[0]
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    } else {
      console.log(`ℹ️ Callback type '${callbackType}' - not final completion, ignoring`)
      
      return new Response(JSON.stringify({ 
        success: true,
        message: `Callback received: ${callbackType}`,
        processing: true
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

  } catch (error) {
    console.error('💥 CRITICAL ERROR in suno-callback function:', error)
    console.error('💥 Error stack:', error.stack)
    
    return new Response(JSON.stringify({ 
      success: false,
      error: 'Internal server error: ' + error.message
    }), {
      status: 200, // Return 200 to acknowledge callback receipt
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
