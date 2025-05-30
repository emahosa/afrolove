
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SunoCallbackData {
  code: number;
  data?: {
    callbackType: string;
    task_id: string;
    data: Array<{
      audio_url?: string;
      stream_audio_url?: string;
      image_url?: string;
      prompt?: string;
      title?: string;
      duration?: number;
      model_name?: string;
      lyric?: string;
    }>;
  };
  // Legacy format support
  task_id?: string;
  status?: string;
  audio_url?: string;
  video_url?: string;
  lyric?: string;
  title?: string;
  tags?: string;
  duration?: number;
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const body: SunoCallbackData = await req.json()
    
    console.log('Suno Callback: Received webhook data:', JSON.stringify(body, null, 2))

    let taskId: string | undefined
    let status: string
    let audioUrl: string | undefined
    let videoUrl: string | undefined
    let lyrics: string | undefined
    let title: string | undefined
    let duration: number | undefined
    let imageUrl: string | undefined
    let modelName: string | undefined

    // Handle new callback format
    if (body.data && body.data.callbackType === 'complete') {
      taskId = body.data.task_id
      status = 'completed'
      
      const songData = body.data.data[0] // Get first song data
      if (songData) {
        audioUrl = songData.audio_url
        imageUrl = songData.image_url
        title = songData.title
        duration = songData.duration
        modelName = songData.model_name
        lyrics = songData.lyric
      }
    } 
    // Handle legacy callback format
    else {
      taskId = body.task_id
      status = body.status || 'unknown'
      audioUrl = body.audio_url
      videoUrl = body.video_url
      lyrics = body.lyric
      title = body.title
      duration = body.duration
    }

    if (!taskId) {
      console.error('No task_id provided in webhook')
      return new Response(
        JSON.stringify({ error: 'task_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Processing callback for task: ${taskId}, status: ${status}`)

    // Find the song with this task ID
    const { data: songs, error: findError } = await supabase
      .from('songs')
      .select('*')
      .eq('audio_url', `task_pending:${taskId}`)

    if (findError) {
      console.error('Error finding song:', findError)
      return new Response(
        JSON.stringify({ error: 'Database error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!songs || songs.length === 0) {
      console.log(`No song found with task ID: ${taskId}`)
      return new Response(
        JSON.stringify({ message: 'Song not found, might already be processed' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const song = songs[0]
    console.log(`Found song: ${song.id} for task: ${taskId}`)

    // Prepare update data based on status
    let updateData: any = {}

    if ((status === 'completed' || status === 'SUCCESS') && audioUrl) {
      // Song generation completed successfully
      updateData = {
        status: 'completed',
        audio_url: audioUrl,
        updated_at: new Date().toISOString()
      }

      // Add optional fields if available
      if (videoUrl) updateData.video_url = videoUrl
      if (imageUrl) updateData.image_url = imageUrl
      if (title && title !== song.title) updateData.title = title
      if (duration) updateData.duration = duration
      if (lyrics) updateData.lyrics = lyrics
      if (modelName) updateData.model_name = modelName

      console.log('Song completed successfully, updating with audio URL:', audioUrl)

    } else if (status === 'failed' || status === 'error' || status === 'FAIL') {
      // Song generation failed
      updateData = {
        status: 'rejected',
        audio_url: `error: Generation failed - ${status}`,
        updated_at: new Date().toISOString()
      }

      console.log('Song generation failed, marking as rejected')

    } else if (status === 'processing' || status === 'queued' || status === 'PENDING' || status === 'TEXT_SUCCESS' || status === 'FIRST_SUCCESS') {
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
    if (status === 'completed' || status === 'SUCCESS') {
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
