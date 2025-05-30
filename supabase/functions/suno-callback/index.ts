
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
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Get song_id from URL parameter
    const url = new URL(req.url)
    const songId = url.searchParams.get('song_id')
    
    const body = await req.json()
    console.log('🔔 Suno Callback received for song ID:', songId)
    console.log('📦 Callback body:', JSON.stringify(body, null, 2))

    if (!songId) {
      console.error('❌ No song_id in callback URL')
      return new Response(JSON.stringify({ error: 'song_id required in URL' }), {
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Find the song by ID
    const { data: song, error: findError } = await supabase
      .from('songs')
      .select('*')
      .eq('id', songId)
      .single()

    if (findError || !song) {
      console.error('❌ Error finding song:', findError)
      return new Response(JSON.stringify({ error: 'Song not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`📋 Found song: ${song.id}, current status: ${song.status}`)

    // Extract the audio data from different possible callback structures
    let audioData = null
    let audioUrl = null
    let streamUrl = null
    let songTitle = null

    // Check different possible structures
    if (body.data && Array.isArray(body.data) && body.data.length > 0) {
      audioData = body.data[0]
    } else if (body.data && typeof body.data === 'object') {
      audioData = body.data
    } else if (body.audio_url) {
      audioData = body
    }

    if (audioData) {
      audioUrl = audioData.audio_url
      streamUrl = audioData.stream_audio_url || audioData.instrumental_url
      songTitle = audioData.title
      console.log('🎵 Extracted audio URL:', audioUrl)
      console.log('🎶 Extracted stream URL:', streamUrl)
    }

    if (!audioUrl) {
      console.error('❌ No audio URL in callback data')
      console.log('📄 Full callback structure:', JSON.stringify(body, null, 2))
      
      // Still acknowledge the callback but don't update
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Callback received but no audio URL found',
        song_id: songId 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Prepare update data
    const updateData = {
      status: 'completed',
      audio_url: audioUrl,
      updated_at: new Date().toISOString()
    }

    // Add optional fields if they exist
    if (streamUrl) {
      updateData.instrumental_url = streamUrl
    }
    
    if (songTitle && (!song.title || song.title === 'Generated Song')) {
      updateData.title = songTitle
    }

    console.log('🔄 Updating song with:', updateData)

    const { error: updateError } = await supabase
      .from('songs')
      .update(updateData)
      .eq('id', song.id)

    if (updateError) {
      console.error('❌ Error updating song:', updateError)
      return new Response(JSON.stringify({ error: 'Update failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`✅ Song ${song.id} updated successfully to completed status`)

    return new Response(JSON.stringify({ 
      success: true, 
      song_id: song.id,
      status: 'completed',
      message: 'Song updated successfully'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('❌ Callback error:', error)
    return new Response(JSON.stringify({ error: 'Internal error: ' + error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
