
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const useSongStatusChecker = () => {
  const { user } = useAuth();
  const [isChecking, setIsChecking] = useState(false);

  const checkSongStatus = useCallback(async (taskId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('suno-status', {
        body: { taskId }
      });

      if (error) {
        console.error('Status check error:', error);
        return false;
      }
      
      if (data?.success && data?.updated) {
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Status check failed:', error);
      return false;
    }
  }, []);

  const checkAllPendingSongs = useCallback(async () => {
    if (!user?.id || isChecking) return;

    try {
      setIsChecking(true);

      const { data: pendingSongs, error } = await supabase
        .from('songs')
        .select('id, title, audio_url, status, created_at')
        .eq('user_id', user.id)
        .eq('status', 'pending');

      if (error) {
        console.error('Error fetching pending songs:', error);
        return;
      }

      if (!pendingSongs || pendingSongs.length === 0) {
        return;
      }

      let updatedCount = 0;
      for (const song of pendingSongs) {
        // Skip if audio_url looks like an actual URL (already completed)
        if (song.audio_url && song.audio_url.startsWith('http')) {
          continue;
        }
        
        const wasUpdated = await checkSongStatus(song.audio_url);
        if (wasUpdated) {
          updatedCount++;
        }
        
        // Wait 2 seconds between checks
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      if (updatedCount > 0) {
        toast.success(`${updatedCount} song(s) completed and updated!`);
        // Force reload to see the changes
        window.location.reload();
      }

    } catch (error) {
      console.error('Error checking pending songs:', error);
      toast.error('Failed to check song status');
    } finally {
      setIsChecking(false);
    }
  }, [user?.id, isChecking, checkSongStatus]);

  // Check every 2 minutes
  useEffect(() => {
    if (!user?.id) return;

    // Initial check
    checkAllPendingSongs();

    // Set up interval for checking
    const interval = setInterval(() => {
      checkAllPendingSongs();
    }, 120000); // 2 minutes

    return () => {
      clearInterval(interval);
    };
  }, [user?.id, checkAllPendingSongs]);

  return {
    checkAllPendingSongs,
    checkSongStatus,
    isChecking
  };
};
