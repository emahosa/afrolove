
import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SunoCallback {
  code: number;
  msg: string;
  data: {
    callbackType: string;
    task_id: string;
    data: Array<{
      id: string;
      audio_url: string;
      stream_audio_url: string;
      image_url: string;
      title: string;
      prompt: string;
      model_name: string;
      duration: number;
      status?: string;
    }>;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const callbackData: SunoCallback = await req.json()
    console.log('=== SUNO CALLBACK RECEIVED ===')
    console.log('Full callback data:', JSON.stringify(callbackData, null, 2))

    if (callbackData.code !== 200) {
      console.error('Suno callback error:', callbackData.msg)
      return new Response(JSON.stringify({ error: callbackData.msg }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      })
    }

    const { task_id, data: tracks } = callbackData.data
    console.log('Task ID:', task_id)
    console.log('Number of tracks received:', tracks?.length || 0)

    if (!tracks || tracks.length === 0) {
      console.error('No tracks in callback data for task:', task_id)
      return new Response(JSON.stringify({ error: 'No tracks received' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      })
    }

    console.log(`Processing ${tracks.length} tracks for task: ${task_id}`)

    // Process each track (usually 1-2 tracks)
    for (const track of tracks) {
      console.log('=== PROCESSING TRACK ===')
      console.log('Track ID:', track.id)
      console.log('Track title:', track.title)
      console.log('Track audio URL:', track.audio_url)
      console.log('Track duration:', track.duration)

      // First check if this is for a custom song request
      console.log('Checking for custom song audio with pattern:', `task_pending:${task_id}`)
      const { data: existingAudio, error: findCustomError } = await supabase
        .from('custom_song_audio')
        .select('*')
        .eq('audio_url', `task_pending:${task_id}`)
        .maybeSingle()

      console.log('Custom song audio query result:', { existingAudio, findCustomError })

      if (existingAudio) {
        console.log('=== CUSTOM SONG PATH ===')
        console.log('Found custom song audio record, updating...')
        // Update custom song audio record
        const { error: updateError } = await supabase
          .from('custom_song_audio')
          .update({
            audio_url: track.audio_url,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingAudio.id)

        console.log('Custom song audio update result:', { updateError })

        if (updateError) {
          console.error('Error updating custom audio record:', updateError)
        } else {
          console.log('Updated custom audio record for request:', existingAudio.request_id)

          // Update the request status
          const { error: requestUpdateError } = await supabase
            .from('custom_song_requests')
            .update({ 
              status: 'audio_uploaded',
              updated_at: new Date().toISOString()
            })
            .eq('id', existingAudio.request_id)
          
          console.log('Custom song request update result:', { requestUpdateError })
        }
      } else {
        console.log('=== GENERAL SONG PATH ===')
        console.log('Looking for pending song with pattern:', `task_pending:${task_id}`)
        
        // Check if this is a general song generation - try exact match first
        const { data: pendingSong, error: findSongError } = await supabase
          .from('songs')
          .select('*')
          .eq('audio_url', `task_pending:${task_id}`)
          .maybeSingle()

        console.log('Pending song query result:', { pendingSong, findSongError })

        if (!pendingSong) {
          console.log('Exact match failed, trying LIKE pattern...')
          const { data: pendingSongLike, error: findSongLikeError } = await supabase
            .from('songs')
            .select('*')
            .like('audio_url', `task_pending:${task_id}%`)
            .maybeSingle()
          
          console.log('LIKE pattern query result:', { pendingSongLike, findSongLikeError })
          
          if (pendingSongLike) {
            console.log('Found pending song with LIKE pattern:', pendingSongLike.id)
            await updateSongRecord(supabase, pendingSongLike, track, task_id)
          } else {
            console.error('=== NO PENDING SONG FOUND ===')
            console.error('No pending song found for task:', task_id)
            
            // Log all pending songs for debugging
            const { data: allPending, error: allPendingError } = await supabase
              .from('songs')
              .select('id, audio_url, user_id, title, status, created_at')
              .like('audio_url', 'task_pending:%')
              .order('created_at', { ascending: false })
              .limit(10)
            
            console.log('Recent pending songs query result:', { allPending, allPendingError })
            console.log('All recent pending songs:', allPending)
            
            // Also check ALL songs for this user to see what's there
            const { data: allUserSongs, error: allUserSongsError } = await supabase
              .from('songs')
              .select('id, audio_url, user_id, title, status, created_at')
              .order('created_at', { ascending: false })
              .limit(20)
            
            console.log('All recent songs in database:', { allUserSongs, allUserSongsError })
          }
        } else {
          console.log('Found pending song with exact match:', pendingSong.id)
          await updateSongRecord(supabase, pendingSong, track, task_id)
        }
      }
    }

    console.log('=== CALLBACK PROCESSING COMPLETE ===')

    return new Response(
      JSON.stringify({ success: true, message: 'Callback processed successfully' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('=== CALLBACK ERROR ===')
    console.error('Error in suno-callback:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Callback processing failed' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})

async function updateSongRecord(supabase: any, pendingSong: any, track: any, taskId: string) {
  try {
    console.log('=== UPDATING SONG RECORD ===')
    console.log('Song ID:', pendingSong.id)
    console.log('User ID:', pendingSong.user_id)
    console.log('Current status:', pendingSong.status)
    console.log('Current audio_url:', pendingSong.audio_url)
    console.log('New audio_url:', track.audio_url)
    console.log('New title:', track.title)
    
    const updateData = {
      title: track.title || pendingSong.title,
      audio_url: track.audio_url,
      status: 'approved',
      updated_at: new Date().toISOString()
    }
    
    console.log('Update data:', updateData)
    
    const { data: updatedSong, error: updateSongError } = await supabase
      .from('songs')
      .update(updateData)
      .eq('id', pendingSong.id)
      .select()
      .single()

    console.log('Song update result:', { updatedSong, updateSongError })

    if (updateSongError) {
      console.error('Error updating song record:', updateSongError)
      throw updateSongError
    } else {
      console.log('✅ Successfully updated song record:', pendingSong.id)
      console.log('✅ Song should now be visible in user library with status: approved')
      console.log('✅ Updated song data:', updatedSong)
      
      // Verify the update by querying the song again
      const { data: verifyData, error: verifyError } = await supabase
        .from('songs')
        .select('*')
        .eq('id', pendingSong.id)
        .single()
      
      console.log('Verification query result:', { verifyData, verifyError })
    }
  } catch (error) {
    console.error('Failed to update song record:', error)
    throw error
  }
}
