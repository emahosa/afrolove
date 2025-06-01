
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

      // Look for songs with pending: prefix in audio_url
      const { data: pendingSongs, error } = await supabase
        .from('songs')
        .select('id, title, audio_url, status, created_at')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .like('audio_url', 'pending:%');

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
      let anyUpdated = false;
      
      for (const song of pendingSongs) {
        // Extract task ID from pending:taskId format
        const taskId = song.audio_url.replace('pending:', '');
        
        if (!taskId) {
          console.log(`⏭️ Skipping song ${song.id} - invalid task ID format: ${song.audio_url}`);
          continue;
        }
        
        console.log(`🔍 Checking song "${song.title}" with task ID: ${taskId}`);
        
        const wasUpdated = await checkSongStatus(taskId);
        if (wasUpdated) {
          updatedCount++;
          anyUpdated = true;
          console.log(`✅ Song "${song.title}" was updated!`);
        }
        
        // Wait between checks to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      if (anyUpdated) {
        console.log(`🎉 ${updatedCount} song(s) completed!`);
        toast.success(`${updatedCount} song(s) completed and ready to play!`);
        
        // Trigger a page refresh to show updated songs
        setTimeout(() => {
          window.location.reload();
        }, 1000);
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

  // Check every 30 seconds for pending songs
  useEffect(() => {
    if (!user?.id) return;

    console.log('🚀 Setting up status checker for user:', user.id);

    // Initial check after 5 seconds
    const initialTimeout = setTimeout(() => {
      checkAllPendingSongs();
    }, 5000);

    // Set up regular interval for checking
    const interval = setInterval(() => {
      console.log('⏰ Periodic status check triggered');
      checkAllPendingSongs();
    }, 30000); // 30 seconds

    return () => {
      console.log('🛑 Cleaning up status checker');
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [user?.id, checkAllPendingSongs]);

  return {
    checkAllPendingSongs,
    checkSongStatus,
    isChecking
  };
};
