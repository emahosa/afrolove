
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    const callbackData = await req.json()
    console.log('Received vocal separation callback:', callbackData)
    
    const { code, msg, data } = callbackData
    
    if (code === 200 && data?.task_id && data?.vocal_removal_info) {
      const { task_id, vocal_removal_info } = data
      const { instrumental_url, origin_url, vocal_url } = vocal_removal_info
      
      // Update the songs table with vocal separation URLs
      const { error: updateError } = await supabase
        .from('songs')
        .update({
          instrumental_url,
          vocal_url,
          vocal_separation_status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('task_id', task_id)
      
      if (updateError) {
        console.error('Error updating song with vocal separation URLs:', updateError)
        return new Response(
          JSON.stringify({ error: 'Failed to update song record' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      console.log('Successfully updated song with vocal separation URLs for task:', task_id)
    } else {
      // Handle failed vocal separation
      const taskId = data?.task_id
      if (taskId) {
        const { error: updateError } = await supabase
          .from('songs')
          .update({
            vocal_separation_status: 'failed',
            updated_at: new Date().toISOString()
          })
          .eq('task_id', taskId)
        
        if (updateError) {
          console.error('Error updating song with failed vocal separation:', updateError)
        }
      }
      
      console.log('Vocal separation failed:', msg)
    }
    
    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
    
  } catch (error) {
    console.error('Error in vocal separation callback:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
