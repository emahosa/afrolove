
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const useSongStatusChecker = () => {
  const { user } = useAuth();
  const [isChecking, setIsChecking] = useState(false);

  const checkSongStatus = useCallback(async (taskId: string) => {
    try {
      console.log('🔍 Checking status for task:', taskId);
      
      const { data, error } = await supabase.functions.invoke('suno-status', {
        body: { taskId }
      });

      if (error) {
        console.error('❌ Status check error:', error);
        return false;
      }
      
      console.log('📊 Status check response:', data);
      
      if (data?.success && data?.updated) {
        console.log('✅ Song was updated!');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('💥 Status check failed:', error);
      return false;
    }
  }, []);

  const checkAllPendingSongs = useCallback(async () => {
    if (!user?.id || isChecking) return;

    try {
      setIsChecking(true);
      console.log('🔍 Checking all pending songs for user:', user.id);

      const { data: pendingSongs, error } = await supabase
        .from('songs')
        .select('id, title, audio_url, status, created_at')
        .eq('user_id', user.id)
        .eq('status', 'pending');

      if (error) {
        console.error('❌ Error fetching pending songs:', error);
        return;
      }

      if (!pendingSongs || pendingSongs.length === 0) {
        console.log('✅ No pending songs found');
        return;
      }

      console.log(`📋 Found ${pendingSongs.length} pending songs to check`);

      let updatedCount = 0;
      for (const song of pendingSongs) {
        // The audio_url field contains the task ID for pending songs
        const taskId = song.audio_url;
        
        // Skip if not a valid task ID
        if (!taskId || taskId.startsWith('http') || taskId.startsWith('error:')) {
          console.log(`⏭️ Skipping song ${song.id} - invalid task ID: ${taskId}`);
          continue;
        }
        
        console.log(`🔍 Checking song "${song.title}" with task ID: ${taskId}`);
        
        const wasUpdated = await checkSongStatus(taskId);
        if (wasUpdated) {
          updatedCount++;
          console.log(`✅ Song "${song.title}" was updated!`);
        }
        
        // Wait 2 seconds between checks to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      if (updatedCount > 0) {
        console.log(`🎉 ${updatedCount} song(s) completed!`);
        toast.success(`${updatedCount} song(s) completed and updated!`);
        // Force reload to see the changes
        window.location.reload();
      } else {
        console.log('⏳ No songs completed yet, still processing...');
      }

    } catch (error) {
      console.error('💥 Error checking pending songs:', error);
      toast.error('Failed to check song status');
    } finally {
      setIsChecking(false);
    }
  }, [user?.id, isChecking, checkSongStatus]);

  // Enhanced polling: Check every 30 seconds instead of 2 minutes
  useEffect(() => {
    if (!user?.id) return;

    console.log('🚀 Setting up enhanced status checker for user:', user.id);

    // Initial check
    checkAllPendingSongs();

    // Set up more frequent interval for checking
    const interval = setInterval(() => {
      console.log('⏰ Periodic status check triggered');
      checkAllPendingSongs();
    }, 30000); // 30 seconds instead of 2 minutes

    return () => {
      console.log('🛑 Cleaning up status checker');
      clearInterval(interval);
    };
  }, [user?.id, checkAllPendingSongs]);

  return {
    checkAllPendingSongs,
    checkSongStatus,
    isChecking
  };
};
