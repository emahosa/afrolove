
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const useSongStatusChecker = () => {
  const { user } = useAuth();
  const [isChecking, setIsChecking] = useState(false);

  const checkSongStatus = useCallback(async (taskId: string) => {
    try {
      console.log('Checking status for task:', taskId);

      const { data, error } = await supabase.functions.invoke('suno-status', {
        body: { taskId }
      });

      if (error) {
        console.error('Status check error:', error);
        return false;
      }

      console.log('Status check response:', data);
      
      if (data?.success && data?.updated) {
        console.log('Song was updated in database');
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
      console.log('Checking all pending songs for user:', user.id);

      const { data: pendingSongs, error } = await supabase
        .from('songs')
        .select('id, title, audio_url, status, created_at')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .not('audio_url', 'is', null);

      if (error) {
        console.error('Error fetching pending songs:', error);
        return;
      }

      if (!pendingSongs || pendingSongs.length === 0) {
        console.log('No pending songs found');
        return;
      }

      console.log('Found pending songs to check:', pendingSongs);

      let updatedCount = 0;
      for (const song of pendingSongs) {
        console.log(`Checking song ${song.id} with task ID: ${song.audio_url}`);
        const wasUpdated = await checkSongStatus(song.audio_url);
        if (wasUpdated) {
          updatedCount++;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      if (updatedCount > 0) {
        toast.success(`${updatedCount} song(s) completed and updated!`);
        window.location.reload();
      } else {
        console.log('No songs were updated');
      }

    } catch (error) {
      console.error('Error checking pending songs:', error);
      toast.error('Failed to check song status');
    } finally {
      setIsChecking(false);
    }
  }, [user?.id, isChecking, checkSongStatus]);

  useEffect(() => {
    if (!user?.id) return;

    checkAllPendingSongs();

    const interval = setInterval(checkAllPendingSongs, 30000);

    return () => clearInterval(interval);
  }, [user?.id, checkAllPendingSongs]);

  return {
    checkAllPendingSongs,
    checkSongStatus,
    isChecking
  };
};
