
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const useSongStatusChecker = () => {
  const { user } = useAuth();
  const [isChecking, setIsChecking] = useState(false);

  const checkSongStatus = useCallback(async (taskId: string) => {
    try {
      console.log('🔍 STATUS CHECKER: Checking status for task:', taskId);

      const { data, error } = await supabase.functions.invoke('suno-status', {
        body: { taskId }
      });

      console.log('🔍 STATUS CHECKER: Response data:', data);
      console.log('🔍 STATUS CHECKER: Response error:', error);

      if (error) {
        console.error('❌ STATUS CHECKER: Status check error:', error);
        return false;
      }
      
      if (data?.success && data?.updated) {
        console.log('✅ STATUS CHECKER: Song was updated in database');
        return true;
      }
      
      console.log('⏳ STATUS CHECKER: Song not updated yet');
      return false;
    } catch (error) {
      console.error('❌ STATUS CHECKER: Status check failed:', error);
      return false;
    }
  }, []);

  const checkAllPendingSongs = useCallback(async () => {
    if (!user?.id || isChecking) return;

    try {
      setIsChecking(true);
      console.log('🔍 STATUS CHECKER: Checking all pending songs for user:', user.id);

      const { data: pendingSongs, error } = await supabase
        .from('songs')
        .select('id, title, audio_url, status, created_at')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .not('audio_url', 'is', null);

      if (error) {
        console.error('❌ STATUS CHECKER: Error fetching pending songs:', error);
        return;
      }

      if (!pendingSongs || pendingSongs.length === 0) {
        console.log('ℹ️ STATUS CHECKER: No pending songs found');
        return;
      }

      console.log('🔍 STATUS CHECKER: Found pending songs to check:', pendingSongs.length);
      console.log('📋 STATUS CHECKER: Pending songs:', JSON.stringify(pendingSongs, null, 2));

      let updatedCount = 0;
      for (const song of pendingSongs) {
        console.log(`🔍 STATUS CHECKER: Checking song ${song.id} with task ID: ${song.audio_url}`);
        const wasUpdated = await checkSongStatus(song.audio_url);
        if (wasUpdated) {
          updatedCount++;
        }
        // Wait 2 seconds between checks to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      if (updatedCount > 0) {
        console.log(`✅ STATUS CHECKER: ${updatedCount} songs were updated`);
        toast.success(`${updatedCount} song(s) completed and updated!`);
        // Force reload to see the changes
        window.location.reload();
      } else {
        console.log('ℹ️ STATUS CHECKER: No songs were updated');
      }

    } catch (error) {
      console.error('❌ STATUS CHECKER: Error checking pending songs:', error);
      toast.error('Failed to check song status');
    } finally {
      setIsChecking(false);
    }
  }, [user?.id, isChecking, checkSongStatus]);

  // Check less frequently since we have webhooks - only check every 2 minutes
  useEffect(() => {
    if (!user?.id) return;

    console.log('📅 STATUS CHECKER: Setting up periodic status checking for user:', user.id);
    
    // Initial check
    checkAllPendingSongs();

    // Set up interval for checking
    const interval = setInterval(() => {
      console.log('⏰ STATUS CHECKER: Periodic check triggered');
      checkAllPendingSongs();
    }, 120000); // 2 minutes

    return () => {
      console.log('🧹 STATUS CHECKER: Cleaning up interval');
      clearInterval(interval);
    };
  }, [user?.id, checkAllPendingSongs]);

  return {
    checkAllPendingSongs,
    checkSongStatus,
    isChecking
  };
};
