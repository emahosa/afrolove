
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { corsHeaders } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const body = await req.json()
    
    console.log('Suno Callback: Received webhook data:', JSON.stringify(body, null, 2))

    // Extract task ID and status from the webhook
    const { task_id, status, audio_url, video_url, lyric, title, tags, duration } = body

    if (!task_id) {
      console.error('No task_id provided in webhook')
      return new Response(
        JSON.stringify({ error: 'task_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Processing callback for task: ${task_id}, status: ${status}`)

    // Find the song with this task ID
    const { data: songs, error: findError } = await supabase
      .from('songs')
      .select('*')
      .eq('audio_url', `task_pending:${task_id}`)

    if (findError) {
      console.error('Error finding song:', findError)
      return new Response(
        JSON.stringify({ error: 'Database error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!songs || songs.length === 0) {
      console.log(`No song found with task ID: ${task_id}`)
      return new Response(
        JSON.stringify({ message: 'Song not found, might already be processed' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const song = songs[0]
    console.log(`Found song: ${song.id} for task: ${task_id}`)

    // Prepare update data based on status
    let updateData: any = {}

    if (status === 'completed' && audio_url) {
      // Song generation completed successfully
      updateData = {
        status: 'completed',
        audio_url: audio_url,
        lyrics: lyric || song.lyrics,
        updated_at: new Date().toISOString()
      }

      // Add optional fields if available
      if (video_url) updateData.video_url = video_url
      if (title && title !== song.title) updateData.title = title
      if (duration) updateData.duration = duration

      console.log('Song completed successfully, updating with audio URL:', audio_url)

    } else if (status === 'failed' || status === 'error') {
      // Song generation failed
      updateData = {
        status: 'rejected',
        audio_url: `error: Generation failed - ${status}`,
        updated_at: new Date().toISOString()
      }

      console.log('Song generation failed, marking as rejected')

    } else if (status === 'processing' || status === 'queued') {
      // Still processing, just update timestamp
      updateData = {
        updated_at: new Date().toISOString()
      }

      console.log('Song still processing, updating timestamp')

    } else {
      console.log(`Unknown status: ${status}, ignoring callback`)
      return new Response(
        JSON.stringify({ message: 'Status not handled' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update the song record
    const { error: updateError } = await supabase
      .from('songs')
      .update(updateData)
      .eq('id', song.id)

    if (updateError) {
      console.error('Error updating song:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to update song' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Song ${song.id} updated successfully with status: ${updateData.status}`)

    // If song completed, log success
    if (status === 'completed') {
      console.log(`🎵 Song "${song.title}" generation completed for user ${song.user_id}`)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Song updated successfully',
        song_id: song.id,
        status: updateData.status
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in suno-callback:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
