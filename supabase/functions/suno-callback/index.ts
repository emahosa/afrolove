import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SunoCallbackData {
  code?: number;
  msg?: string;
  data?: {
    callbackType?: string;
    task_id?: string;
    taskId?: string;
    data?: Array<{
      audio_url?: string;
      stream_audio_url?: string;
      image_url?: string;
      prompt?: string;
      title?: string;
      duration?: number;
      model_name?: string;
      lyric?: string;
      id?: string;
    }>;
  };
  // Direct format support
  task_id?: string;
  taskId?: string;
  status?: string;
  audio_url?: string;
  video_url?: string;
  lyric?: string;
  title?: string;
  tags?: string;
  duration?: number;
  // Array format for multiple songs
  songs?: Array<{
    audio_url?: string;
    stream_audio_url?: string;
    image_url?: string;
    prompt?: string;
    title?: string;
    duration?: number;
    model_name?: string;
    lyric?: string;
    id?: string;
  }>;
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
    let status: string = 'completed'
    let audioUrl: string | undefined
    let videoUrl: string | undefined
    let lyrics: string | undefined
    let title: string | undefined
    let duration: number | undefined
    let imageUrl: string | undefined
    let modelName: string | undefined

    // Try multiple extraction methods for task ID
    taskId = body.data?.task_id || 
              body.data?.taskId || 
              body.task_id || 
              body.taskId

    console.log('Extracted task ID:', taskId)

    // Handle nested data structure
    if (body.data?.data && Array.isArray(body.data.data) && body.data.data.length > 0) {
      const songData = body.data.data[0]
      audioUrl = songData.audio_url || songData.stream_audio_url
      imageUrl = songData.image_url
      title = songData.title
      duration = songData.duration
      modelName = songData.model_name
      lyrics = songData.lyric
      console.log('Used nested data structure for song data')
    }
    // Handle songs array format
    else if (body.songs && Array.isArray(body.songs) && body.songs.length > 0) {
      const songData = body.songs[0]
      audioUrl = songData.audio_url || songData.stream_audio_url
      imageUrl = songData.image_url
      title = songData.title
      duration = songData.duration
      modelName = songData.model_name
      lyrics = songData.lyric
      console.log('Used songs array for song data')
    }
    // Handle direct properties
    else {
      audioUrl = body.audio_url
      videoUrl = body.video_url
      lyrics = body.lyric
      title = body.title
      duration = body.duration
      status = body.status || 'completed'
      console.log('Used direct properties for song data')
    }

    console.log('Extracted data:', {
      taskId,
      status,
      audioUrl,
      videoUrl,
      lyrics,
      title,
      duration,
      imageUrl,
      modelName
    })

    if (!taskId) {
      console.error('No task_id provided in webhook')
      return new Response(
        JSON.stringify({ error: 'task_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Find the song with this task ID in the audio_url field
    const { data: songs, error: findError } = await supabase
      .from('songs')
      .select('*')
      .eq('audio_url', `task_pending:${taskId}`)

    if (findError) {
      console.error('Error finding song:', findError)
      return new Response(
        JSON.stringify({ error: 'Database error finding song' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!songs || songs.length === 0) {
      console.log(`No song found with task ID: ${taskId}`)
      
      // Also try to find by any audio_url containing the task ID
      const { data: altSongs, error: altFindError } = await supabase
        .from('songs')
        .select('*')
        .like('audio_url', `%${taskId}%`)

      if (altFindError) {
        console.error('Error in alternative song search:', altFindError)
      } else if (altSongs && altSongs.length > 0) {
        console.log(`Found song with alternative search: ${altSongs[0].id}`)
        // Continue with this song
        songs.push(...altSongs)
      } else {
        return new Response(
          JSON.stringify({ message: 'Song not found, might already be processed' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    const song = songs[0]
    console.log(`Processing song: ${song.id} for task: ${taskId}`)

    // Prepare update data
    let updateData: any = {
      updated_at: new Date().toISOString()
    }

    // Check if we have an audio URL (successful completion)
    if (audioUrl && audioUrl !== 'null' && audioUrl.trim() !== '') {
      updateData.status = 'completed'
      updateData.audio_url = audioUrl
      
      // Add optional fields if available
      if (videoUrl) updateData.video_url = videoUrl
      if (imageUrl) updateData.image_url = imageUrl
      if (title && title !== song.title) updateData.title = title
      if (duration) updateData.duration = duration
      if (lyrics) updateData.lyrics = lyrics
      if (modelName) updateData.model_name = modelName

      console.log('Song completed successfully, updating with audio URL:', audioUrl)
    }
    // Check for explicit failure status
    else if (status && ['failed', 'error', 'FAIL', 'ERROR'].includes(status.toUpperCase())) {
      updateData.status = 'rejected'
      updateData.audio_url = `error: Generation failed - ${status}`
      console.log('Song generation failed, marking as rejected')
    }
    // Check for processing status
    else if (status && ['processing', 'queued', 'PENDING', 'TEXT_SUCCESS', 'FIRST_SUCCESS'].includes(status.toUpperCase())) {
      // Just update timestamp, keep current status
      console.log('Song still processing, updating timestamp only')
    }
    // No audio URL and unclear status
    else {
      console.log('No clear completion status, marking as failed due to missing audio')
      updateData.status = 'rejected'
      updateData.audio_url = 'error: No audio URL received from Suno API'
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

    console.log(`Song ${song.id} updated successfully:`, updateData)

    // If song completed, log success
    if (updateData.status === 'completed') {
      console.log(`🎵 Song "${song.title}" generation completed for user ${song.user_id}`)
      console.log(`🎵 Audio URL: ${updateData.audio_url}`)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Callback processed successfully',
        song_id: song.id,
        status: updateData.status,
        audio_url: updateData.audio_url
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in suno-callback:', error)
    console.error('Error details:', error.message)
    console.error('Error stack:', error.stack)
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
