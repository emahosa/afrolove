
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
    console.log('Callback timestamp:', new Date().toISOString())
    console.log('Full callback data:', JSON.stringify(callbackData, null, 2))

    // Validate callback data
    if (callbackData.code !== 200) {
      console.error('Suno callback error:', callbackData.msg)
      return new Response(JSON.stringify({ error: callbackData.msg }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      })
    }

    const { task_id, data: tracks } = callbackData.data
    console.log('Processing callback for task ID:', task_id)
    console.log('Number of tracks received:', tracks?.length || 0)

    if (!tracks || tracks.length === 0) {
      console.error('No tracks in callback data for task:', task_id)
      return new Response(JSON.stringify({ error: 'No tracks received' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      })
    }

    // Process each track
    for (const track of tracks) {
      console.log('=== PROCESSING TRACK ===')
      console.log('Track ID:', track.id)
      console.log('Track title:', track.title)
      console.log('Track audio URL:', track.audio_url)
      console.log('Track duration:', track.duration)

      // Check for custom song request first
      const { data: existingAudio, error: findCustomError } = await supabase
        .from('custom_song_audio')
        .select('*')
        .eq('audio_url', `task_pending:${task_id}`)
        .maybeSingle()

      console.log('Custom song audio search result:', { existingAudio, findCustomError })

      if (existingAudio) {
        console.log('=== UPDATING CUSTOM SONG ===')
        
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
          console.log('✅ Updated custom audio record:', existingAudio.id)

          // Update the request status
          const { error: requestUpdateError } = await supabase
            .from('custom_song_requests')
            .update({ 
              status: 'audio_uploaded',
              updated_at: new Date().toISOString()
            })
            .eq('id', existingAudio.request_id)
          
          console.log('Custom song request update result:', { requestUpdateError })
          
          if (!requestUpdateError) {
            console.log('✅ Updated custom song request status to audio_uploaded')
          }
        }
      } else {
        console.log('=== UPDATING GENERAL SONG ===')
        
        // Find pending song with matching task ID
        const { data: pendingSongs, error: findSongError } = await supabase
          .from('songs')
          .select('*')
          .eq('audio_url', `task_pending:${task_id}`)

        console.log('Pending songs search result:', { 
          count: pendingSongs?.length || 0, 
          findSongError,
          searchPattern: `task_pending:${task_id}`
        })

        if (pendingSongs && pendingSongs.length > 0) {
          const pendingSong = pendingSongs[0]
          console.log('Found pending song:', pendingSong.id)
          
          await updateSongRecord(supabase, pendingSong, track, task_id)
        } else {
          console.log('No exact match found, trying LIKE pattern...')
          
          const { data: pendingSongLike, error: findSongLikeError } = await supabase
            .from('songs')
            .select('*')
            .like('audio_url', `task_pending:${task_id}%`)
            .limit(1)
          
          console.log('LIKE pattern search result:', { 
            found: pendingSongLike?.length || 0, 
            findSongLikeError 
          })
          
          if (pendingSongLike && pendingSongLike.length > 0) {
            await updateSongRecord(supabase, pendingSongLike[0], track, task_id)
          } else {
            console.error('=== NO PENDING SONG FOUND ===')
            
            // Try emergency fallback - find any pending song for recent time
            const { data: anyPending, error: anyPendingError } = await supabase
              .from('songs')
              .select('*')
              .eq('status', 'pending')
              .gte('created_at', new Date(Date.now() - 10 * 60 * 1000).toISOString()) // Last 10 minutes
              .order('created_at', { ascending: false })
              .limit(1)
            
            console.log('Emergency fallback search:', { 
              found: anyPending?.length || 0, 
              anyPendingError 
            })
            
            if (anyPending && anyPending.length > 0) {
              console.log('Using emergency fallback song:', anyPending[0].id)
              await updateSongRecord(supabase, anyPending[0], track, task_id)
            } else {
              console.error('❌ No pending songs found to update for task:', task_id)
            }
          }
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
    console.error('Error processing callback:', error)
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
    console.log('Song to update:', {
      id: pendingSong.id,
      user_id: pendingSong.user_id,
      current_status: pendingSong.status,
      current_audio_url: pendingSong.audio_url
    })
    
    const updateData = {
      title: track.title || pendingSong.title,
      audio_url: track.audio_url,
      status: 'completed',
      updated_at: new Date().toISOString()
    }
    
    console.log('Update data:', updateData)
    
    const { data: updatedSong, error: updateSongError } = await supabase
      .from('songs')
      .update(updateData)
      .eq('id', pendingSong.id)
      .select()
      .single()

    if (updateSongError) {
      console.error('❌ Error updating song record:', updateSongError)
      throw updateSongError
    } else {
      console.log('✅ Successfully updated song record:', pendingSong.id)
      console.log('✅ New song status:', updatedSong.status)
      console.log('✅ New audio URL:', updatedSong.audio_url)
      
      // Verify the update
      const { data: verifyData, error: verifyError } = await supabase
        .from('songs')
        .select('id, title, status, audio_url, user_id')
        .eq('id', pendingSong.id)
        .single()
      
      console.log('Update verification:', { verifyData, verifyError })
    }
  } catch (error) {
    console.error('❌ Failed to update song record:', error)
    throw error
  }
}
